#[cfg(test)]
pub mod currencies {

    use crate::routes::currencies::get_currency::*;
    use crate::routes::currencies::post_currency::*;
    use crate::tests::commons::*;
    use crate::tests::user_tests::users::drivers::*;
    use actix_http::StatusCode;
    use actix_test::TestServer;
    use actix_web::http::header::ContentType;
    use drivers::*;

    pub mod drivers {

        use super::*;

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

            if let Some(query) = query {
                req = req
                    .query(&[("id", query.id), ("date", query.date)])
                    .expect("unable to unpack query")
            }

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

        pub async fn bootstrap_base_curr(
            ticker_name: (&str, &str),
            token: &str,
            srv: &TestServer,
        ) -> String {
            driver_post_currency(
                Some(token),
                TestBody::Expected(
                    crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                        name: ticker_name.1.to_string(),
                        ticker: ticker_name.0.to_string(),
                        fallback_rate_amount: None,
                        fallback_rate_currency_id: None,
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

        pub async fn bootstrap_sec_curr(
            ticker_name: (&str, &str),
            fallback_rate: &str,
            fallback_curr_id: &str,
            token: &str,
            srv: &TestServer,
        ) -> String {
            driver_post_currency(
                Some(token),
                TestBody::Expected(
                    crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                        name: ticker_name.1.to_string(),
                        ticker: ticker_name.0.to_string(),
                        fallback_rate_amount: Some(fallback_rate.to_string()),
                        fallback_rate_currency_id: Some(fallback_curr_id.to_string()),
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

        pub async fn bootstrap_get_curr(
            target_id: Option<String>,
            date: Option<String>,
            token: &str,
            srv: &TestServer,
        ) -> GetCurrencyResponse {
            driver_get_currencies(
                Some(GetCurrencyQuery {
                    id: target_id,
                    date,
                }),
                Some(token),
                srv,
                true,
            )
            .await
            .expected
            .unwrap()
        }
    }

    mod tests {
        use super::*;
        use crate::tests::currency_rate_datum::currency_rate_datums::drivers::bootstrap_post_rate_datum;

        #[actix_web::test]
        async fn test_currencies_rate_sec_fallback() {
            let srv = setup_connection().await;
            let user_1_token = bootstrap_token(("123", "123"), &srv).await;
            let base_curr_id =
                bootstrap_base_curr(("BASE", "Base Curr"), &user_1_token, &srv).await;
            let sec_curr_id = bootstrap_sec_curr(
                ("Sec", "Sec Curr"),
                "5",
                base_curr_id.as_str(),
                &user_1_token,
                &srv,
            )
            .await;
            let fetch_result =
                bootstrap_get_curr(Some(sec_curr_id.clone()), None, &user_1_token, &srv).await;

            assert_eq!(fetch_result.items.len(), 1);
            assert_eq!(fetch_result.items.first().unwrap().id, sec_curr_id);
            assert_eq!(fetch_result.items.first().unwrap().rate_to_base, "5");
        }

        #[actix_web::test]
        async fn test_currencies_rate_base() {
            let srv = setup_connection().await;
            let user_1_token = bootstrap_token(("123", "123"), &srv).await;
            let base_curr_id =
                bootstrap_base_curr(("BASE", "Base Curr"), &user_1_token, &srv).await;
            let fetch_result =
                bootstrap_get_curr(Some(base_curr_id.clone()), None, &user_1_token, &srv).await;

            assert_eq!(fetch_result.items.len(), 1);
            assert_eq!(fetch_result.items.first().unwrap().id, base_curr_id);
            assert_eq!(fetch_result.items.first().unwrap().rate_to_base, "1");
        }

        #[actix_web::test]
        async fn test_currencies_rate_sec_normal() {
            let srv = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &srv).await;
            let base_curr_id = bootstrap_base_curr(("BASE", "Base Curr"), &token, &srv).await;
            let sec_curr_id = bootstrap_sec_curr(
                ("Sec", "Sec Curr"),
                "3.14",
                base_curr_id.as_str(),
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "10",
                "2025-01-01T01:00:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "12",
                "2025-01-01T01:01:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "14",
                "2025-01-01T01:02:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "16",
                "2025-01-01T01:03:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;

            let cases: Vec<(&str, &str)> = vec![
                ("2025-01-01T00:59:00.000Z", "3.14"),
                ("2025-01-01T01:00:00.000Z", "10"),
                ("2025-01-01T01:01:00.000Z", "12"),
                ("2025-01-01T01:02:00.000Z", "14"),
                ("2025-01-01T01:03:00.000Z", "16"),
                ("2025-01-01T01:04:00.000Z", "16"),
                ("2025-01-01T01:02:30.000Z", "15"),
            ];

            for (index, case) in cases.iter().enumerate() {
                let fetch_result = bootstrap_get_curr(
                    Some(sec_curr_id.clone()),
                    Some(case.0.to_string()),
                    &token,
                    &srv,
                )
                .await;
                assert!(
                    !fetch_result.items.is_empty(),
                    "Returned items vector is empty."
                );
                assert_eq!(
                    fetch_result.items.first().unwrap().id,
                    sec_curr_id,
                    "returned result is not the target currency in assertion {}",
                    index
                );
                assert_eq!(
                    fetch_result.items.first().unwrap().rate_to_base,
                    case.1,
                    "returned result failed assertion {}",
                    index
                );
            }
        }

        #[actix_web::test]
        async fn test_currencies_rate_nested_normal() {
            let srv = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &srv).await;
            let base_curr_id = bootstrap_base_curr(("BASE", "Base Curr"), &token, &srv).await;
            let sec_curr_id = bootstrap_sec_curr(
                ("Sec", "Sec Curr"),
                "3.14",
                base_curr_id.as_str(),
                &token,
                &srv,
            )
            .await;
            let thi_curr_id =
                bootstrap_sec_curr(("Thi", "Thi Curr"), "6", sec_curr_id.as_str(), &token, &srv)
                    .await;
            bootstrap_post_rate_datum(
                "10",
                "2025-01-01T01:00:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "12",
                "2025-01-01T01:01:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "14",
                "2025-01-01T01:02:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "16",
                "2025-01-01T01:03:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "0",
                "2025-01-01T01:00:00.000Z",
                &sec_curr_id,
                &thi_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "2",
                "2025-01-01T01:01:00.000Z",
                &sec_curr_id,
                &thi_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "4",
                "2025-01-01T01:02:00.000Z",
                &sec_curr_id,
                &thi_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "6",
                "2025-01-01T01:03:00.000Z",
                &sec_curr_id,
                &thi_curr_id,
                &token,
                &srv,
            )
            .await;

            let cases: Vec<(&str, &str, &str)> = vec![
                (sec_curr_id.as_str(), "2025-01-01T00:59:00.000Z", "3.14"),
                (thi_curr_id.as_str(), "2025-01-01T00:59:00.000Z", "18.84"),
                (thi_curr_id.as_str(), "2025-01-01T01:00:00.000Z", "0"),
                (thi_curr_id.as_str(), "2025-01-01T01:01:00.000Z", "24"),
                (thi_curr_id.as_str(), "2025-01-01T01:01:30.000Z", "40"),
            ];

            for (index, case) in cases.iter().enumerate() {
                let fetch_result = bootstrap_get_curr(
                    Some(case.0.to_string()),
                    Some(case.1.to_string()),
                    &token,
                    &srv,
                )
                .await;
                assert!(
                    !fetch_result.items.is_empty(),
                    "Returned items vector is empty."
                );
                assert_eq!(
                    fetch_result.items.first().unwrap().id,
                    case.0.to_string(),
                    "returned result is not the target currency in assertion {}",
                    index
                );
                assert_eq!(
                    fetch_result.items.first().unwrap().rate_to_base,
                    case.2,
                    "returned result failed assertion {}",
                    index
                );
            }
        }

        #[actix_web::test]
        async fn test_currencies_rate_rounding() {
            let srv = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &srv).await;
            let base_curr_id = bootstrap_base_curr(("BASE", "Base Curr"), &token, &srv).await;
            let sec_curr_id = bootstrap_sec_curr(
                ("Sec", "Sec Curr"),
                "3.14",
                base_curr_id.as_str(),
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "10",
                "2025-01-01T01:00:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "12",
                "2025-01-01T01:01:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "14.33333333333333333333",
                "2025-01-01T01:02:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "16",
                "2025-01-01T01:03:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;

            let cases: Vec<(&str, &str)> = vec![
                ("2025-01-01T01:00:11.111Z", "10.37036666666666666667"),
                ("2025-01-01T01:00:03.000Z", "10.1"),
                ("2025-01-01T01:00:03.300Z", "10.11"),
                ("2025-01-01T01:01:03.300Z", "12.12833333333333333333"),
                ("2025-01-01T01:01:03.627Z", "12.14105"),
            ];

            for (index, case) in cases.iter().enumerate() {
                let fetch_result = bootstrap_get_curr(
                    Some(sec_curr_id.clone()),
                    Some(case.0.to_string()),
                    &token,
                    &srv,
                )
                .await;
                assert!(
                    !fetch_result.items.is_empty(),
                    "Returned items vector is empty."
                );
                assert_eq!(
                    fetch_result.items.first().unwrap().id,
                    sec_curr_id,
                    "returned result is not the target currency in assertion {}",
                    index
                );
                assert_eq!(
                    fetch_result.items.first().unwrap().rate_to_base,
                    case.1,
                    "returned result failed assertion {}",
                    index
                );
            }
        }

        #[actix_web::test]
        async fn test_no_repeated_tickers() {
            let srv = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &srv).await;
            let base_curr_id = bootstrap_base_curr(("BASE", "Base Curr"), &token, &srv).await;
            let _sec_curr_id = bootstrap_sec_curr(
                ("SEC", "Sec Curr"),
                "3.14",
                base_curr_id.as_str(),
                &token,
                &srv,
            )
            .await;
            // Disallow creating second currency with same ticker
            {
                let resp = driver_post_currency(
                    Some(&token),
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("123"),
                            ticker: String::from("Sec"),
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
        }

        #[actix_web::test]
        async fn test_no_repeated_names() {
            let srv = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &srv).await;
            let base_curr_id = bootstrap_base_curr(("BASE", "Base Curr"), &token, &srv).await;
            let _sec_curr_id = bootstrap_sec_curr(
                ("Sec", "Sec Curr"),
                "3.14",
                base_curr_id.as_str(),
                &token,
                &srv,
            )
            .await;
            // Disallow creating second currency with same names
            {
                let resp = driver_post_currency(
                    Some(&token),
                    TestBody::Expected(
                        crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                            name: String::from("Sec Curr"),
                            ticker: String::from("123"),
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
        }

        #[actix_web::test]
        async fn test_bursts() {
            let srv = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &srv).await;
            let base_curr_id = bootstrap_base_curr(("BASE", "Base Curr"), &token, &srv).await;
            let sec_curr_id = bootstrap_sec_curr(
                ("Sec", "Sec Curr"),
                "3.14",
                base_curr_id.as_str(),
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "10",
                "2025-01-01T01:00:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "12",
                "2025-01-01T01:01:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "14.33333333333333333333",
                "2025-01-01T01:02:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
            bootstrap_post_rate_datum(
                "16",
                "2025-01-01T01:03:00.000Z",
                &base_curr_id,
                &sec_curr_id,
                &token,
                &srv,
            )
            .await;
        }

        #[actix_web::test]
        async fn test_no_repeated_base() {
            let srv = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &srv).await;
            let _base_curr_id = bootstrap_base_curr(("BASE", "Base Curr"), &token, &srv).await;

            let resp = driver_post_currency(
                Some(&token),
                TestBody::Expected(
                    crate::routes::currencies::post_currency::PostCurrencyRequestBody {
                        name: String::from("Sec Curr"),
                        ticker: String::from("123"),
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
                "Disallow creating repeated base currencies."
            );
        }

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
                    StatusCode::NOT_FOUND,
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
                        date: None,
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
                        date: None,
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
                        date: None,
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
                        date: None,
                    }),
                    Some(&user_1_token),
                    &srv,
                    true,
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
