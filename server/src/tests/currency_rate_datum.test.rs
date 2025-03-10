#[cfg(test)]
pub mod currency_rate_datums {

    use crate::tests::commons::setup_connection;
    use crate::tests::commons::*;
    use crate::tests::user_tests::users::drivers::*;
    use actix_http::{Request, StatusCode};
    use actix_web::body::MessageBody;
    use actix_web::{
        dev::{Service, ServiceResponse},
        http::{header::ContentType, Method},
        test::{self},
    };
    use crate::tests::currency_rate_datum::currency_rate_datums::drivers::driver_post_currency_rate_datum;

    pub mod drivers {
        use crate::routes::currency_rate_datums::post_currency_rate_datum::*;
        use super::*;

        pub async fn driver_post_currency_rate_datum(
            token: Option<&str>,
            body: TestBody<PostCurrencyRateDatumRequestBody>,
            app: &actix_test::TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<PostCurrencyRateDatumResponseBody> {
            let mut req = app.post("/currency_rate_datums");
            req = attach_token_to_req(req, token);
            req = req.insert_header(ContentType::json());
            let mut res = send_req_with_body(req, body).await;
            let res_parsed: AssertTestResponse<PostCurrencyRateDatumResponseBody> =
                parse_response_body(&mut res).await;
            if assert_default {
                assert_eq!(res.status(), StatusCode::OK);
            }
            res_parsed
        }
    }

    mod tests {
        use chrono::{NaiveDate, TimeZone};
        use finance_manager_migration::{ChronoDateTimeUtc, DateTime};

        use crate::{routes::{currencies::post_currency::PostCurrencyRequestBody, currency_rate_datums::post_currency_rate_datum::PostCurrencyRateDatumRequestBody}, tests::currency_tests::currencies::drivers::driver_post_currency, *};
        use super::*;

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
                true
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
                    name: String::from("Base Currency"),
                    ticker: String::from("BASE"),
                }),
                &srv,
                true
            )
            .await
            .expected
            .unwrap()
            .id;

            // Create valid datum
            {
                driver_post_currency_rate_datum(
                    Some(&user_token),
                    TestBody::Expected(PostCurrencyRateDatumRequestBody {
                        ref_currency_id: second_currency_id.clone(),
                        ref_amount_currency_id: base_currency_id.clone(),
                        amount: "10".to_string(),
                        date: chrono::Utc.with_ymd_and_hms(2000,1, 1, 1, 1, 1).unwrap().naive_utc(),
                    }),
                    &srv,
                    true
                )
                .await;
            }

            // TODO: For some reason index doesnt work in tests
            // // Disallow multiple datums on the same time
            // {
            //     let resp = driver_post_currency_rate_datum::<_, _, false>(
            //         TestBody::Expected(PostCurrencyRateDatumRequestBody {
            //             ref_currency_id: second_currency_id.clone(),
            //             ref_amount_currency_id: base_currency_id.clone(),
            //             amount: "10".to_string(),
            //             date: 1,
            //         }),
            //         Some(&user_1_token),
            //         &app,
            //     )
            //     .await;
            //     assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            // }

            // Disallow cyclic datums
            {
                let resp = driver_post_currency_rate_datum(
                    Some(&user_token),
                    TestBody::Expected(PostCurrencyRateDatumRequestBody {
                        ref_currency_id: second_currency_id.clone(),
                        ref_amount_currency_id: second_currency_id.clone(),
                        amount: "10".to_string(),
                        date: chrono::Utc.with_ymd_and_hms(2000,1, 1, 1, 1, 1).unwrap().naive_utc(),
                    }),
                    &srv,
                    false
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }

            // Disallow unknown currencies
            {
                let resp = driver_post_currency_rate_datum(
                    Some(&user_token),
                    TestBody::Expected(PostCurrencyRateDatumRequestBody {
                        ref_currency_id: uuid::Uuid::new_v4().to_string(),
                        ref_amount_currency_id: base_currency_id.clone(),
                        amount: "10".to_string(),
                        date: chrono::Utc.with_ymd_and_hms(2000,1, 1, 1, 1, 1).unwrap().naive_utc(),
                    }),
                    &srv,
                    false
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }
        }
    }
}
