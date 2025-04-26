#[cfg(test)]
pub mod currency_rate_datums {

    use crate::routes::currency_rate_datums::post_currency_rate_datum::*;
    use crate::tests::commons::requests::AssertTestResponse;
    use crate::tests::commons::requests::TestBody;
    use crate::tests::commons::requests::attach_token_to_req;
    use crate::tests::commons::requests::parse_response_body;
    use crate::tests::commons::requests::send_req_with_body;
    use crate::tests::commons::setups::setup_connection;
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
            let mut req = app.post("/api/v1/currencyRateDatums");
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
        use serde_json::json;

        use super::*;
        use crate::{
            routes::currency_rate_datums::post_currency_rate_datum::PostCurrencyRateDatumRequest,
            tests::currency_tests::currencies::drivers::bootstrap_base_curr,
            tests::currency_tests::currencies::drivers::bootstrap_sec_curr,
        };

        #[actix_web::test]
        async fn test_create_datum_extra_fields() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let sec_cid = bootstrap_sec_curr(
                ("Sec", "Sec Curr"),
                "5",
                base_cid.as_str(),
                &token,
                &runtime.server,
            )
            .await;

            let mut base_valid_json = json!(PostCurrencyRateDatumRequest {
                ref_currency_id: sec_cid.clone(),
                ref_amount_currency_id: base_cid.clone(),
                amount: "10".to_string(),
                date_utc: "2000-01-01T01:01:01.000Z".to_string(),
            });
            base_valid_json["extra_field"] = json!("test");

            let resp = driver_post_currency_rate_datum(
                Some(&token),
                TestBody::Bytes(base_valid_json.to_string().as_bytes().into()),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_create_datum_invalid_dates() {
            let runtime = setup_connection().await;
            let user_token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_currency_id =
                bootstrap_base_curr(("BASE", "Base Currency"), &user_token, &runtime.server).await;
            let second_currency_id = bootstrap_sec_curr(
                ("SEC", "Secondary Currency"),
                "10",
                base_currency_id.as_str(),
                &user_token,
                &runtime.server,
            )
            .await;

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
                    &runtime.server,
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
                    &runtime.server,
                    false,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }
        }

        #[actix_web::test]
        async fn test_create_datum_cyclic() {
            let runtime = setup_connection().await;
            let user_token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_currency_id =
                bootstrap_base_curr(("BASE", "Base Currency"), &user_token, &runtime.server).await;
            let second_currency_id = bootstrap_sec_curr(
                ("SEC", "Secondary Currency"),
                "10",
                base_currency_id.as_str(),
                &user_token,
                &runtime.server,
            )
            .await;

            let resp = driver_post_currency_rate_datum(
                Some(&user_token),
                TestBody::Expected(PostCurrencyRateDatumRequest {
                    ref_currency_id: second_currency_id.clone(),
                    ref_amount_currency_id: second_currency_id.clone(),
                    amount: "10".to_string(),
                    date_utc: "2000-01-01T01:01:01.000Z".to_string(),
                }),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_create_datum_unknown_currency() {
            let runtime = setup_connection().await;
            let user_token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_currency_id =
                bootstrap_base_curr(("BASE", "Base Currency"), &user_token, &runtime.server).await;

            let resp = driver_post_currency_rate_datum(
                Some(&user_token),
                TestBody::Expected(PostCurrencyRateDatumRequest {
                    ref_currency_id: uuid::Uuid::new_v4().to_string(),
                    ref_amount_currency_id: base_currency_id.clone(),
                    amount: "10".to_string(),
                    date_utc: "2000-01-01T01:01:01.000Z".to_string(),
                }),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::NOT_FOUND);
        }

        #[actix_web::test]
        async fn test_curd_currency_rate_datums() {
            let runtime = setup_connection().await;
            let user_token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_currency_id =
                bootstrap_base_curr(("BASE", "Base Currency"), &user_token, &runtime.server).await;
            let second_currency_id = bootstrap_sec_curr(
                ("SEC", "Secondary Currency"),
                "10",
                base_currency_id.as_str(),
                &user_token,
                &runtime.server,
            )
            .await;

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
                    &runtime.server,
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
            //         &runtime.server,
            //         false,
            //     )
            //     .await;
            //     assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            // }
        }
    }
}
