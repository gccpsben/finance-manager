#[cfg(test)]
pub mod currency_rate_datums {

    use crate::routes::currency_rate_datums::post_currency_rate_datum::*;
    use crate::tests::commons::setup_connection;
    use crate::tests::commons::*;
    use crate::tests::currency_rate_datum::currency_rate_datums::drivers::*;
    use crate::tests::user_tests::users::drivers::*;
    use actix_http::StatusCode;
    use actix_test::TestServer;
    use actix_web::http::header::ContentType;

    pub mod drivers {
        use super::*;

        pub async fn driver_post_currency_rate_datum(
            token: Option<&str>,
            body: TestBody<PostCurrencyRateDatumRequest>,
            app: &actix_test::TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<PostCurrencyRateDatumResponse> {
            let mut req = app.post("/currency_rate_datums");
            req = attach_token_to_req(req, token);
            req = req.insert_header(ContentType::json());
            let mut res = send_req_with_body(req, body).await;
            let res_parsed: AssertTestResponse<PostCurrencyRateDatumResponse> =
                parse_response_body(&mut res).await;
            if assert_default {
                assert_eq!(res.status(), StatusCode::OK);
            }
            res_parsed
        }

        pub async fn bootstrap_post_rate_datum(
            amount: &str,
            date_utc: &str,
            ref_amount_currency_id: &str,
            ref_currency_id: &str,
            token: &str,
            srv: &TestServer,
        ) -> String {
            driver_post_currency_rate_datum(
                Some(token),
                TestBody::Expected(
                    crate::routes::currency_rate_datums::post_currency_rate_datum::PostCurrencyRateDatumRequest {
                        amount: amount.to_string(),
                        date_utc: date_utc.to_string(),
                        ref_amount_currency_id: ref_amount_currency_id.to_string(),
                        ref_currency_id: ref_currency_id.to_string(),
                    },
                ),
                srv,
                true,
            )
            .await
            .expected
            .unwrap()
            .id
        }
    }

    mod tests {
        use super::*;
        use crate::{
            routes::{
                currencies::post_currency::PostCurrencyRequestBody,
                currency_rate_datums::post_currency_rate_datum::PostCurrencyRateDatumRequest,
            },
            tests::currency_tests::currencies::drivers::driver_post_currency,
        };

        #[actix_web::test]
        async fn test_curd_currency_rate_datums() {
            let srv = setup_connection().await;
            let user_token = bootstrap_token(("123", "123"), &srv).await;

            // Create valid base currency
            let base_currency_id = driver_post_currency(
                Some(&user_token),
                TestBody::Expected(PostCurrencyRequestBody {
                    fallback_rate_amount: None,
                    fallback_rate_currency_id: None,
                    name: String::from("Base Currency"),
                    ticker: String::from("BASE"),
                }),
                &srv,
                true,
            )
            .await
            .expected
            .unwrap()
            .id;

            // Create valid secondary currency
            let second_currency_id = driver_post_currency(
                Some(&user_token),
                TestBody::Expected(PostCurrencyRequestBody {
                    fallback_rate_amount: Some("10".to_string()),
                    fallback_rate_currency_id: Some(base_currency_id.clone()),
                    name: String::from("Secondary Currency"),
                    ticker: String::from("SEC"),
                }),
                &srv,
                true,
            )
            .await
            .expected
            .unwrap()
            .id;

            // Create datum with invalid dates (missing UTC)
            {
                let resp = driver_post_currency_rate_datum(
                    Some(&user_token),
                    TestBody::Expected(PostCurrencyRateDatumRequest {
                        ref_currency_id: second_currency_id.clone(),
                        ref_amount_currency_id: base_currency_id.clone(),
                        amount: "10".to_string(),
                        date_utc: "2000-01-01T01:01:01.000".to_string(),
                    }),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }

            // Create datum with invalid dates (missing T)
            {
                let resp = driver_post_currency_rate_datum(
                    Some(&user_token),
                    TestBody::Expected(PostCurrencyRateDatumRequest {
                        ref_currency_id: second_currency_id.clone(),
                        ref_amount_currency_id: base_currency_id.clone(),
                        amount: "10".to_string(),
                        date_utc: "2000-01-01 01:01:01.000Z".to_string(),
                    }),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }

            // Create valid datum
            {
                driver_post_currency_rate_datum(
                    Some(&user_token),
                    TestBody::Expected(PostCurrencyRateDatumRequest {
                        ref_currency_id: second_currency_id.clone(),
                        ref_amount_currency_id: base_currency_id.clone(),
                        amount: "10".to_string(),
                        date_utc: "2000-01-01T01:01:01.000Z".to_string(),
                    }),
                    &srv,
                    true,
                )
                .await;
            }

            // // Disallow multiple datums on the same time for the same currency
            // {
            //     let resp = driver_post_currency_rate_datum(
            //         Some(&user_token),
            //         TestBody::Expected(PostCurrencyRateDatumRequestBody {
            //             ref_currency_id: second_currency_id.clone(),
            //             ref_amount_currency_id: base_currency_id.clone(),
            //             amount: "11".to_string(),
            //             date_utc: "2000-01-01T01:01:01.000Z".to_string(),
            //         }),
            //         &srv,
            //         false,
            //     )
            //     .await;
            //     assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            // }

            // Disallow cyclic datums
            {
                let resp = driver_post_currency_rate_datum(
                    Some(&user_token),
                    TestBody::Expected(PostCurrencyRateDatumRequest {
                        ref_currency_id: second_currency_id.clone(),
                        ref_amount_currency_id: second_currency_id.clone(),
                        amount: "10".to_string(),
                        date_utc: "2000-01-01T01:01:01.000Z".to_string(),
                    }),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }

            // Disallow unknown currencies
            {
                let resp = driver_post_currency_rate_datum(
                    Some(&user_token),
                    TestBody::Expected(PostCurrencyRateDatumRequest {
                        ref_currency_id: uuid::Uuid::new_v4().to_string(),
                        ref_amount_currency_id: base_currency_id.clone(),
                        amount: "10".to_string(),
                        date_utc: "2000-01-01T01:01:01.000Z".to_string(),
                    }),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(resp.status, StatusCode::NOT_FOUND);
            }
        }
    }
}
