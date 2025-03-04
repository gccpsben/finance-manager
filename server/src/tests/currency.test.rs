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
        use actix_http::StatusCode;
        use actix_web::http::header::ContentType;

        use crate::{
            routes::currencies::{
                get_currency::{GetCurrencyQuery, GetCurrencyResponse},
                post_currency::{PostCurrencyRequestBody, PostCurrencyResponseBody},
            },
            tests::commons::{
                attach_token_to_req, parse_response_body, send_req_with_body, AssertTestResponse,
                TestBody,
            },
        };

        pub async fn driver_post_currency(
            token: Option<&str>,
            body: TestBody<PostCurrencyRequestBody>,
            app: &actix_test::TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<PostCurrencyResponseBody> {
            let mut req = app.post("/currencies");
            req = attach_token_to_req(req, token);
            req = req.insert_header(ContentType::json());
            let mut res = send_req_with_body(req, body).await;
            let res_parsed: AssertTestResponse<PostCurrencyResponseBody> =
                parse_response_body(&mut res).await;
            if assert_default {
                assert_eq!(res.status(), StatusCode::OK);
            }
            res_parsed
        }

        pub async fn driver_get_currencies(
            query: Option<GetCurrencyQuery>,
            token: Option<&str>,
            app: &actix_test::TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<GetCurrencyResponse> {
            let mut req = app.get("/currencies");

            // TODO: shorten this
            req = match query {
                Some(query) => match query.id {
                    Some(id) => req.query(&[("id", id)]).expect("unable to unpack query"),
                    None => req,
                },
                _ => req,
            };

            req = req.insert_header(ContentType::json());
            req = attach_token_to_req(req, token);
            let mut res = req.send().await.unwrap();
            let res_parsed: AssertTestResponse<GetCurrencyResponse> =
                parse_response_body(&mut res).await;
            if assert_default {
                assert_eq!(res.status(), StatusCode::OK);
            }
            res_parsed
        }
    }

    mod tests {
        use actix_http::StatusCode;

        use crate::{
            routes::currencies::get_currency::GetCurrencyQuery,
            tests::{
                commons::{setup_connection, TestBody},
                currency_tests::currencies::drivers::{
                    driver_get_currencies, driver_post_currency,
                },
                user_tests::users::drivers::bootstrap_token,
            },
        };

        #[actix_web::test]
        async fn test_curd_currencies() {
            let srv = setup_connection().await;
            let user_1_token = bootstrap_token(("123", "123"), &srv).await;

            // Create currency without token
            {
                let resp = driver_post_currency(
                    None,
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr1"),
                            ticker: String::from("CUR1"),
                            fallback_rate_amount: None,
                            fallback_rate_currency_id: None,
                        },
                    ),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(
                    resp.status,
                    StatusCode::UNAUTHORIZED,
                    "Create currency without token"
                );
            }

            // Ensure fallback rate amount and fallback rate currency must coexist.
            {
                let resp = driver_post_currency(
                    Some(&user_1_token),
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr1"),
                            ticker: String::from("CUR1"),
                            fallback_rate_amount: Some(String::from("123")),
                            fallback_rate_currency_id: None,
                        },
                    ),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(
                    resp.status,
                    StatusCode::BAD_REQUEST,
                    "Create currency without token"
                );
            }

            // Create valid base currency
            let base_currency_id = driver_post_currency(
                Some(&user_1_token),
                TestBody::Expected(
                    crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                        name: String::from("Curr1"),
                        ticker: String::from("CUR1"),
                        fallback_rate_amount: None,
                        fallback_rate_currency_id: None,
                    },
                ),
                &srv,
                true,
            )
            .await
            .expected
            .unwrap()
            .id;

            // Disallow creating second currency with same name
            {
                let resp = driver_post_currency(
                    Some(&user_1_token),
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr1"),
                            ticker: String::from("CUR2"),
                            fallback_rate_amount: None,
                            fallback_rate_currency_id: None,
                        },
                    ),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(
                    resp.status,
                    StatusCode::BAD_REQUEST,
                    "Disallow creating second currency with same name"
                );
            }

            // Disallow creating second currency with same ticker
            {
                let resp = driver_post_currency(
                    Some(&user_1_token),
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr2"),
                            ticker: String::from("CUR1"),
                            fallback_rate_amount: None,
                            fallback_rate_currency_id: None,
                        },
                    ),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(
                    resp.status,
                    StatusCode::BAD_REQUEST,
                    "Disallow creating second currency with same ticker"
                );
            }

            // Disallow creating second base currency
            {
                let resp = driver_post_currency(
                    Some(&user_1_token),
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr2"),
                            ticker: String::from("CUR2"),
                            fallback_rate_amount: None,
                            fallback_rate_currency_id: None,
                        },
                    ),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(
                    resp.status,
                    StatusCode::BAD_REQUEST,
                    "Disallow creating second currency with same ticker"
                );
            }

            // Create secondary currency referencing unknown currency
            {
                let resp = driver_post_currency(
                    Some(&user_1_token),
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
                    &srv,
                    false,
                )
                .await;
                assert_eq!(
                    resp.status,
                    StatusCode::BAD_REQUEST,
                    "Create secondary currency referencing unknown currency"
                );
            }

            // Create secondary currency referencing invalid uuid
            {
                let resp = driver_post_currency(
                    Some(&user_1_token),
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Curr2"),
                            ticker: String::from("CUR2"),
                            fallback_rate_amount: Some("2".to_string()),
                            fallback_rate_currency_id: Some(format!("{}asd", base_currency_id)),
                        },
                    ),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(
                    resp.status,
                    StatusCode::BAD_REQUEST,
                    "Create secondary currency referencing invalid uuid"
                );
            }

            // Create valid secondary currency
            let secondary_currency_id = driver_post_currency(
                Some(&user_1_token),
                TestBody::Expected(
                    crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                        name: String::from("Curr2"),
                        ticker: String::from("CUR2"),
                        fallback_rate_amount: Some("2".to_string()),
                        fallback_rate_currency_id: Some(base_currency_id.clone()),
                    },
                ),
                &srv,
                true,
            )
            .await
            .expected
            .unwrap()
            .id;

            // Get created base currency
            {
                let resp = driver_get_currencies(
                    Some(GetCurrencyQuery {
                        id: Some(base_currency_id.clone()),
                    }),
                    Some(&user_1_token),
                    &srv,
                    true,
                )
                .await;
                let expected_body = resp.expected.unwrap();

                assert_eq!(
                    expected_body.items.len(),
                    1,
                    "Get created base currency: len = 1"
                );
                assert_eq!(
                    expected_body.items.first().unwrap().id,
                    base_currency_id,
                    "Get created base currency: first item's id must match"
                );
                assert_eq!(
                    expected_body.items.first().unwrap().fallback_rate_amount,
                    None,
                    "Get created base currency: fallback_rate_amount is none"
                );
                assert_eq!(
                    expected_body
                        .items
                        .first()
                        .unwrap()
                        .fallback_rate_currency_id,
                    None,
                    "Get created base currency: fallback_rate_currency_id is none"
                );
                assert!(
                    expected_body.items.first().unwrap().is_base,
                    "Get created base currency: is base"
                );
            }

            // Get invalid uuid currency
            {
                let resp = driver_get_currencies(
                    Some(GetCurrencyQuery {
                        id: Some(base_currency_id.clone()),
                    }),
                    Some(&user_1_token),
                    &srv,
                    true,
                )
                .await;
                let expected_body = resp.expected.unwrap();

                assert_eq!(expected_body.items.len(), 1);
                assert_eq!(expected_body.items.first().unwrap().id, base_currency_id);
                assert_eq!(
                    expected_body.items.first().unwrap().fallback_rate_amount,
                    None
                );
                assert_eq!(
                    expected_body
                        .items
                        .first()
                        .unwrap()
                        .fallback_rate_currency_id,
                    None
                );
                assert!(expected_body.items.first().unwrap().is_base);
            }

            // Get invalid uuid currency
            {
                let resp = driver_get_currencies(
                    Some(GetCurrencyQuery {
                        id: Some(String::from("abcd")),
                    }),
                    Some(&user_1_token),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST)
            }

            // Get created secondary currency
            {
                let resp = driver_get_currencies(
                    Some(GetCurrencyQuery {
                        id: Some(secondary_currency_id.clone()),
                    }),
                    Some(&user_1_token),
                    &srv,
                    false,
                )
                .await;

                let expected_body = resp.expected.unwrap();

                assert_eq!(expected_body.items.len(), 1);
                assert_eq!(
                    expected_body.items.first().unwrap().id,
                    secondary_currency_id
                );
                assert!(!expected_body.items.first().unwrap().is_base);
            }
        }
    }
}
