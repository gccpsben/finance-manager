#[cfg(test)]
pub mod currencies {

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
    pub mod drivers {
        use crate::routes::currencies::post_currency::{
            PostCurrencyRequestBody, PostCurrencyResponseBody,
        };

        use super::*;
        pub async fn driver_post_currency<
            B: MessageBody,
            E: std::fmt::Debug,
            const ASSERT_DEFAULT: bool,
        >(
            body: TestBody<PostCurrencyRequestBody>,
            token: Option<&str>,
            app: &impl Service<Request, Response = ServiceResponse<B>, Error = E>,
        ) -> AssertTestResponse<PostCurrencyResponseBody> {
            let mut req = test::TestRequest::default();
            req = req.insert_header(ContentType::json());
            req = attach_token_to_req(req, token);
            req = match body {
                TestBody::Serialize(seral) => req.set_json(seral),
                TestBody::Expected(expected_body) => req.set_json(expected_body),
            };
            req = req.uri("/currencies");
            req = req.method(Method::POST);
            let res = test::call_service(app, req.to_request()).await;
            let res_parsed = parse_response_body(res).await;
            if ASSERT_DEFAULT {
                assert_eq!(res_parsed.status, StatusCode::OK);
                assert!(res_parsed.expected.is_some());
            }
            res_parsed
        }
    }

    mod tests {
        use super::{drivers::driver_post_currency, *};
        use crate::routes::users::register::PostUserRequestBody;

        #[actix_web::test]
        async fn test_curd_currencies() {
            let app = setup_connection().await;
            let user_1_creds = PostUserRequestBody {
                password: String::from("123"),
                username: String::from("123"),
            };

            // Post user
            let _user_1_id = {
                driver_post_user::<_, _, true>(TestBody::Expected(user_1_creds.clone()), &app)
                    .await
                    .expected
                    .unwrap()
                    .id
            };

            // Login
            let user_1_token = {
                driver_login_user::<_, _, true>(
                    TestBody::Expected((&user_1_creds.username, &user_1_creds.password)),
                    &app,
                )
                .await
                .expected
                .unwrap()
                .token
            };

            // Create currency without token
            {
                let resp = driver_post_currency::<_, _, false>(
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr1"),
                            ticker: String::from("CUR1"),
                            fallback_rate_amount: None,
                            fallback_rate_currency_id: None,
                        },
                    ),
                    None,
                    &app,
                )
                .await;
                assert_eq!(resp.status, StatusCode::UNAUTHORIZED);
            }

            // Ensure fallback rate amount and fallback rate currency must coexist.
            {
                let resp = driver_post_currency::<_, _, false>(
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr1"),
                            ticker: String::from("CUR1"),
                            fallback_rate_amount: Some(String::from("123")),
                            fallback_rate_currency_id: None,
                        },
                    ),
                    Some(&user_1_token),
                    &app,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }

            // Create valid base currency
            let base_currency_id = {
                driver_post_currency::<_, _, true>(
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr1"),
                            ticker: String::from("CUR1"),
                            fallback_rate_amount: None,
                            fallback_rate_currency_id: None,
                        },
                    ),
                    Some(&user_1_token),
                    &app,
                )
                .await
                .expected
                .unwrap()
                .id
            };

            // Disallow creating second currency with same name
            {
                let resp = driver_post_currency::<_, _, false>(
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr1"),
                            ticker: String::from("CUR2"),
                            fallback_rate_amount: None,
                            fallback_rate_currency_id: None,
                        },
                    ),
                    Some(&user_1_token),
                    &app,
                )
                .await;

                assert_eq!(resp.status, StatusCode::BAD_REQUEST)
            };

            // Disallow creating second currency with same ticker
            {
                let resp = driver_post_currency::<_, _, false>(
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr2"),
                            ticker: String::from("CUR1"),
                            fallback_rate_amount: None,
                            fallback_rate_currency_id: None,
                        },
                    ),
                    Some(&user_1_token),
                    &app,
                )
                .await;

                assert_eq!(resp.status, StatusCode::BAD_REQUEST)
            };

            // Disallow creating second base currency
            {
                let resp = driver_post_currency::<_, _, false>(
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr2"),
                            ticker: String::from("CUR2"),
                            fallback_rate_amount: None,
                            fallback_rate_currency_id: None,
                        },
                    ),
                    Some(&user_1_token),
                    &app,
                )
                .await;

                assert_eq!(resp.status, StatusCode::BAD_REQUEST)
            };

            // Create secondary currency referencing unknown currency
            {
                let resp = driver_post_currency::<_, _, false>(
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr2"),
                            ticker: String::from("CUR2"),
                            fallback_rate_amount: Some("2".to_string()),
                            fallback_rate_currency_id: Some(format!(
                                "{}A1234",
                                &base_currency_id[0..base_currency_id.len() - 5]
                            )),
                        },
                    ),
                    Some(&user_1_token),
                    &app,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }

            // Create secondary currency referencing invalid uuid
            {
                let resp = driver_post_currency::<_, _, false>(
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr2"),
                            ticker: String::from("CUR2"),
                            fallback_rate_amount: Some("2".to_string()),
                            fallback_rate_currency_id: Some(format!("{}asd", base_currency_id)),
                        },
                    ),
                    Some(&user_1_token),
                    &app,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }

            // Create valid secondary currency
            {
                driver_post_currency::<_, _, true>(
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr2"),
                            ticker: String::from("CUR2"),
                            fallback_rate_amount: Some("2".to_string()),
                            fallback_rate_currency_id: Some(base_currency_id),
                        },
                    ),
                    Some(&user_1_token),
                    &app,
                )
                .await;
            }
        }
    }
}
