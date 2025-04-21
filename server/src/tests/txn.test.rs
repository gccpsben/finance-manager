#[cfg(test)]
pub mod txns {
    use crate::routes::txns::get_txns::GetTxnsResponse;
    use crate::routes::txns::post_txns::PostTxnRequest;
    use crate::routes::txns::post_txns::PostTxnResponse;
    use crate::tests::commons::attach_token_to_req;
    use crate::tests::commons::parse_response_body;
    use crate::tests::commons::send_req_with_body;
    use crate::tests::commons::AssertTestResponse;
    use crate::tests::commons::TestBody;
    use actix_http::StatusCode;
    use actix_web::http::header::ContentType;
    use uuid::Uuid;

    pub mod drivers {

        use crate::routes::txns::get_txn::GetTxnResponse;

        use super::*;

        pub async fn driver_post_txn(
            token: Option<&str>,
            body: TestBody<PostTxnRequest>,
            app: &actix_test::TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<PostTxnResponse> {
            let mut req = app.post("/api/v1/txns");
            req = attach_token_to_req(req, token);
            req = req.insert_header(ContentType::json());
            let mut res = send_req_with_body(req, body).await;
            let res_parsed = parse_response_body(&mut res).await;
            if assert_default {
                assert_eq!(
                    res.status(),
                    StatusCode::OK,
                    "body: {:?} {:?}",
                    res_parsed.json,
                    res_parsed.str
                );
            }
            res_parsed
        }

        pub async fn driver_get_txns(
            token: Option<&str>,
            app: &actix_test::TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<GetTxnsResponse> {
            let mut req = app.get("/api/v1/txns");
            req = attach_token_to_req(req, token);
            req = req.insert_header(ContentType::json());
            let mut res = req.send().await.unwrap();
            let res_parsed = parse_response_body(&mut res).await;
            if assert_default {
                assert_eq!(
                    res.status(),
                    StatusCode::OK,
                    "body: {:?} {:?}",
                    res_parsed.json,
                    res_parsed.str
                );
            }
            res_parsed
        }

        pub async fn driver_get_txn(
            id: Option<&str>,
            token: Option<&str>,
            app: &actix_test::TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<GetTxnResponse> {
            let mut req = app.get("/api/v1/txn");
            req = attach_token_to_req(req, token);
            req = req.insert_header(ContentType::json());
            if let Some(target_id) = id {
                req = req.query(&[("id", target_id)]).unwrap();
            }
            let mut res = req.send().await.unwrap();
            let res_parsed = parse_response_body(&mut res).await;
            if assert_default {
                assert_eq!(
                    res.status(),
                    StatusCode::OK,
                    "body: {:?} {:?}",
                    res_parsed.json,
                    res_parsed.str
                );
            }
            res_parsed
        }
    }

    mod tests {

        use serde_json::json;

        use super::drivers::driver_get_txn;
        use super::drivers::driver_get_txns;
        use super::drivers::driver_post_txn;
        use super::*;
        use crate::routes::txns::post_txns::PostTxnRequestFragment;
        use crate::routes::txns::post_txns::PostTxnRequestFragmentSide;
        use crate::tests::account_tests::accounts::drivers::bootstrap_post_account;
        use crate::tests::commons::setup_connection;
        use crate::tests::currency_tests::currencies::drivers::bootstrap_base_curr;
        use crate::tests::txn_tag::txn_tags::drivers::bootstrap_txn_tag;
        use crate::tests::user_tests::users::drivers::bootstrap_token;

        /// Test for IDOR vulnerability in posting transactions.
        #[actix_web::test]
        async fn test_create_txn_idor_vulnerability() {
            let server = setup_connection().await.server;
            let token_u1 = bootstrap_token(("user_1", "123"), &server).await.token;
            let token_u2 = bootstrap_token(("user_2", "123"), &server).await.token;
            let base_cid_u1 = bootstrap_base_curr(("BASE", "Base"), &token_u1, &server).await;
            let base_cid_u2 = bootstrap_base_curr(("BASE", "Base"), &token_u2, &server).await;
            let first_account_u1 = bootstrap_post_account("My account", &token_u1, &server).await;
            let first_account_u2 = bootstrap_post_account("My account", &token_u2, &server).await;

            let mut test_case_num = 0;
            let mut test = async |side: PostTxnRequestFragmentSide, token: &str, is_from: bool| {
                test_case_num += 1;
                let resp = driver_post_txn(
                    Some(token),
                    TestBody::Expected(PostTxnRequest {
                        description: "my description".to_string(),
                        title: "my title 1".to_string(),
                        date_utc: "2025-02-01T01:02:00.000Z".to_string(),
                        fragments: vec![match is_from {
                            true => PostTxnRequestFragment {
                                from: Some(side),
                                to: None,
                            },
                            false => PostTxnRequestFragment {
                                from: None,
                                to: Some(side),
                            },
                        }],
                        tags: vec![],
                    }),
                    &server,
                    false,
                )
                .await;
                assert_eq!(
                    resp.status,
                    StatusCode::NOT_FOUND,
                    "Test for IDOR vulnerability posting txn [currency]. test case num: {}",
                    test_case_num
                );
            };

            // Posting txn of u1, referencing u2's base currency [FROM]
            test(
                PostTxnRequestFragmentSide {
                    account: first_account_u1.clone(),
                    currency: base_cid_u2.clone(),
                    amount: "1".to_string(),
                },
                &token_u1,
                true,
            )
            .await;

            // Posting txn of u2, referencing u1's base currency  [FROM]
            test(
                PostTxnRequestFragmentSide {
                    account: first_account_u2.clone(),
                    currency: base_cid_u1.clone(),
                    amount: "1".to_string(),
                },
                &token_u2,
                true,
            )
            .await;

            // Posting txn of u1, referencing u2's base currency [TO]
            test(
                PostTxnRequestFragmentSide {
                    account: first_account_u1.clone(),
                    currency: base_cid_u2.clone(),
                    amount: "1".to_string(),
                },
                &token_u1,
                false,
            )
            .await;

            // Posting txn of u2, referencing u1's base currency  [TO]
            test(
                PostTxnRequestFragmentSide {
                    account: first_account_u2.clone(),
                    currency: base_cid_u1.clone(),
                    amount: "1".to_string(),
                },
                &token_u2,
                false,
            )
            .await;

            // Posting txn of u1, referencing u2's account  [FROM]
            test(
                PostTxnRequestFragmentSide {
                    account: first_account_u2.clone(),
                    currency: base_cid_u1.clone(),
                    amount: "1".to_string(),
                },
                &token_u1,
                true,
            )
            .await;

            // Posting txn of u2, referencing u1's account  [FROM]
            test(
                PostTxnRequestFragmentSide {
                    account: first_account_u1.clone(),
                    currency: base_cid_u2.clone(),
                    amount: "1".to_string(),
                },
                &token_u2,
                true,
            )
            .await;
        }

        #[actix_web::test]
        async fn test_curd_txns() {
            let runtime = setup_connection().await;

            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let first_account = bootstrap_post_account("My account", &token, &runtime.server).await;
            let first_tag = bootstrap_txn_tag("my tag", &token, &runtime.server).await;

            let first_txn_to_post = PostTxnRequest {
                description: "my description".to_string(),
                title: "my title 1".to_string(),
                date_utc: "2025-02-01T01:02:00.000Z".to_string(),
                fragments: vec![PostTxnRequestFragment {
                    from: Some(PostTxnRequestFragmentSide {
                        account: first_account.clone(),
                        currency: base_cid.clone(),
                        amount: "1".to_string(),
                    }),
                    to: None,
                }],
                tags: vec![first_tag.clone()],
            };

            let second_txn_to_post = PostTxnRequest {
                description: "my description".to_string(),
                title: "my title 2".to_string(),
                date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                fragments: vec![
                    PostTxnRequestFragment {
                        from: Some(PostTxnRequestFragmentSide {
                            account: first_account.clone(),
                            currency: base_cid.clone(),
                            amount: "1".to_string(),
                        }),
                        to: None,
                    },
                    PostTxnRequestFragment {
                        to: Some(PostTxnRequestFragmentSide {
                            account: first_account.clone(),
                            currency: base_cid.clone(),
                            amount: "1".to_string(),
                        }),
                        from: None,
                    },
                ],
                tags: vec![],
            };

            // Creating valid txn (single fragment)
            driver_post_txn(
                Some(&token),
                TestBody::Expected(first_txn_to_post.clone()),
                &runtime.server,
                true,
            )
            .await;

            // Creating valid txn (multiple fragments)
            driver_post_txn(
                Some(&token),
                TestBody::Expected(second_txn_to_post.clone()),
                &runtime.server,
                true,
            )
            .await;

            // Getting the created txns
            {
                let resp = driver_get_txns(Some(&token), &runtime.server, true).await;
                let mut txns = resp
                    .expected
                    .expect("returned items not empty")
                    .items
                    .clone();
                assert_eq!(txns.len(), 2, "expect there are 2 items");
                txns.sort_by_key(|x| x.date.clone());
                txns.reverse();
                let item_0 = txns.first().unwrap();
                let item_1 = txns.get(1).unwrap();

                assert_eq!(item_0.title, first_txn_to_post.title);
                assert_eq!(item_0.date, first_txn_to_post.date_utc);
                assert_eq!(item_0.description, first_txn_to_post.description);
                assert_eq!(item_1.title, second_txn_to_post.title);
                assert_eq!(item_1.date, second_txn_to_post.date_utc);
                assert_eq!(item_1.description, second_txn_to_post.description);

                // Checking for fragments
                {
                    // First txn
                    {
                        assert_eq!(item_0.fragments.len(), 1);
                        let first_frag_from = item_0
                            .fragments
                            .first()
                            .unwrap()
                            .clone()
                            .from
                            .clone()
                            .unwrap();
                        assert_eq!(
                            first_frag_from.account.to_string(),
                            first_account.to_string()
                        );
                        assert_eq!(first_frag_from.amount.to_string(), "1");
                        assert_eq!(first_frag_from.currency.to_string(), base_cid.to_string());
                    }

                    // Sec txn
                    {
                        {
                            assert_eq!(item_1.fragments.len(), 2);
                            let first_frag_from = item_1
                                .fragments
                                .first()
                                .unwrap()
                                .clone()
                                .from
                                .clone()
                                .unwrap();
                            let first_frag_to =
                                item_1.fragments.first().unwrap().clone().to.clone();
                            assert_eq!(
                                first_frag_from.account.to_string(),
                                first_account.to_string()
                            );
                            assert_eq!(first_frag_from.amount.to_string(), "1");
                            assert_eq!(first_frag_from.currency.to_string(), base_cid.to_string());
                            assert!(first_frag_to.is_none());
                        }

                        {
                            let sec_frag_from =
                                item_1.fragments.get(1).unwrap().clone().from.clone();
                            let sec_frag_to =
                                item_1.fragments.get(1).unwrap().clone().to.clone().unwrap();
                            assert_eq!(sec_frag_to.account.to_string(), first_account.to_string());
                            assert_eq!(sec_frag_to.amount.to_string(), "1");
                            assert_eq!(sec_frag_to.currency.to_string(), base_cid.to_string());
                            assert!(sec_frag_from.is_none());
                        }
                    }
                }

                // Checking for tags
                {
                    // First txn
                    {
                        assert_eq!(item_0.tags.len(), 1);
                        assert_eq!(item_0.tags.first(), first_txn_to_post.tags.first())
                    }

                    // Second txn
                    {
                        assert_eq!(item_1.tags.len(), 0);
                    }
                }

                assert_eq!(item_1.fragments.len(), 2);
            }
        }

        #[actix_web::test]
        async fn test_create_get_txn_single_fragment() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let first_account = bootstrap_post_account("My account", &token, &runtime.server).await;
            let first_tag = bootstrap_txn_tag("my tag", &token, &runtime.server).await;

            let txn_to_be_posted = PostTxnRequest {
                description: "my description".to_string(),
                title: "my title 1".to_string(),
                date_utc: "2025-02-01T01:02:00.000Z".to_string(),
                fragments: vec![PostTxnRequestFragment {
                    from: Some(PostTxnRequestFragmentSide {
                        account: first_account.clone(),
                        currency: base_cid.clone(),
                        amount: "1".to_string(),
                    }),
                    to: None,
                }],
                tags: vec![first_tag.clone()],
            };

            driver_post_txn(
                Some(&token),
                TestBody::Expected(txn_to_be_posted.clone()),
                &runtime.server,
                true,
            )
            .await;

            let resp = driver_get_txns(Some(&token), &runtime.server, true).await;
            let txns = resp
                .expected
                .expect("returned items not empty")
                .items
                .clone();
            assert_eq!(txns.len(), 1, "expect there are 1 item");
            let item_0 = txns.first().unwrap();
            assert_eq!(item_0.fragments.len(), 1);
            let first_fragment = item_0.fragments.first().unwrap().clone();
            let first_frag_from = first_fragment.from.clone().unwrap();
            let first_frag_to = first_fragment.to.clone();
            assert_eq!(
                first_frag_from.account.to_string(),
                first_account.to_string()
            );
            assert_eq!(first_frag_from.amount.to_string(), "1");
            assert_eq!(first_frag_from.currency.to_string(), base_cid.to_string());
            assert_eq!(first_frag_to, None);
        }

        #[actix_web::test]
        async fn test_create_txn_unknown_currency() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let first_account = bootstrap_post_account("My account", &token, &runtime.server).await;

            let resp = driver_post_txn(
                Some(&token),
                TestBody::Expected(PostTxnRequest {
                    description: "my description".to_string(),
                    title: "my title".to_string(),
                    date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                    fragments: vec![PostTxnRequestFragment {
                        from: Some(PostTxnRequestFragmentSide {
                            account: format!("{}A1234", &first_account[0..first_account.len() - 5]),
                            currency: base_cid.clone(),
                            amount: "1".to_string(),
                        }),
                        to: None,
                    }],
                    tags: vec![],
                }),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::NOT_FOUND);
        }

        #[actix_web::test]
        async fn test_create_txn_empty_json() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;

            let resp = driver_post_txn(
                Some(&token),
                TestBody::Bytes(Box::from(json!({}).to_string().as_bytes())),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_create_txn_incomplete_fragment_sides() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let first_account = bootstrap_post_account("My account", &token, &runtime.server).await;
            let post_and_assert = async |json_value: serde_json::Value| {
                let resp = driver_post_txn(
                    Some(&token),
                    TestBody::Bytes(Box::from(json_value.to_string().as_bytes())),
                    &runtime.server,
                    false,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            };

            // missing currency
            {
                let mut base_valid_json = json!(PostTxnRequest {
                    description: "my description".to_string(),
                    title: "my title".to_string(),
                    date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                    fragments: vec![PostTxnRequestFragment {
                        from: Some(PostTxnRequestFragmentSide {
                            account: first_account.clone(),
                            currency: base_cid.clone(),
                            amount: "1".to_string(),
                        }),
                        to: None,
                    }],
                    tags: vec![],
                });
                base_valid_json["fragments"][0]["from"]["currency"] = json!(null);
                post_and_assert(base_valid_json).await;
            }

            // missing amount
            {
                let mut base_valid_json = json!(PostTxnRequest {
                    description: "my description".to_string(),
                    title: "my title".to_string(),
                    date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                    fragments: vec![PostTxnRequestFragment {
                        from: Some(PostTxnRequestFragmentSide {
                            account: first_account.clone(),
                            currency: base_cid.clone(),
                            amount: "1".to_string(),
                        }),
                        to: None,
                    }],
                    tags: vec![],
                });
                base_valid_json["fragments"][0]["from"]["amount"] = json!(null);
                post_and_assert(base_valid_json).await;
            }

            // missing account
            {
                let mut base_valid_json = json!(PostTxnRequest {
                    description: "my description".to_string(),
                    title: "my title".to_string(),
                    date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                    fragments: vec![PostTxnRequestFragment {
                        from: Some(PostTxnRequestFragmentSide {
                            account: first_account.clone(),
                            currency: base_cid.clone(),
                            amount: "1".to_string(),
                        }),
                        to: None,
                    }],
                    tags: vec![],
                });
                base_valid_json["fragments"][0]["from"]["account"] = json!(null);
                post_and_assert(base_valid_json).await;
            }
        }

        #[actix_web::test]
        async fn test_create_txn_unknown_account() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let first_account = bootstrap_post_account("My account", &token, &runtime.server).await;

            let resp = driver_post_txn(
                Some(&token),
                TestBody::Expected(PostTxnRequest {
                    description: "my description".to_string(),
                    title: "my title".to_string(),
                    date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                    fragments: vec![PostTxnRequestFragment {
                        from: Some(PostTxnRequestFragmentSide {
                            account: first_account.clone(),
                            currency: format!("{}A1234", &base_cid[0..base_cid.len() - 5]),
                            amount: "1".to_string(),
                        }),
                        to: None,
                    }],
                    tags: vec![],
                }),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::NOT_FOUND);
        }

        #[actix_web::test]
        async fn test_create_txn_repeated_tags() {
            let runtime = setup_connection().await;

            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let first_account = bootstrap_post_account("My account", &token, &runtime.server).await;
            let first_tag = bootstrap_txn_tag("my tag", &token, &runtime.server).await;

            let txn_req = PostTxnRequest {
                description: "my description".to_string(),
                title: "my title 1".to_string(),
                date_utc: "2025-02-01T01:02:00.000Z".to_string(),
                fragments: vec![PostTxnRequestFragment {
                    from: Some(PostTxnRequestFragmentSide {
                        account: first_account.clone(),
                        currency: base_cid.clone(),
                        amount: "1".to_string(),
                    }),
                    to: None,
                }],
                tags: vec![first_tag.clone(), first_tag],
            };

            let resp = driver_post_txn(
                Some(&token),
                TestBody::Expected(txn_req.clone()),
                &runtime.server,
                false,
            )
            .await;

            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_create_txn_extra_args_req_root() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let first_account = bootstrap_post_account("My account", &token, &runtime.server).await;

            let mut base_valid_json = json!(PostTxnRequest {
                description: "my description".to_string(),
                title: "my title".to_string(),
                date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                fragments: vec![PostTxnRequestFragment {
                    from: Some(PostTxnRequestFragmentSide {
                        account: first_account.clone(),
                        currency: base_cid.clone(),
                        amount: "1".to_string(),
                    }),
                    to: None,
                }],
                tags: vec![],
            });
            base_valid_json["test_not_expected_arg"] = json!(1);

            let resp = driver_post_txn(
                Some(&token),
                TestBody::Bytes(Box::from(base_valid_json.to_string().as_bytes())),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_create_txn_extra_args_req_frag() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let first_account = bootstrap_post_account("My account", &token, &runtime.server).await;

            let mut base_valid_json = json!(PostTxnRequest {
                description: "my description".to_string(),
                title: "my title".to_string(),
                date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                fragments: vec![PostTxnRequestFragment {
                    from: Some(PostTxnRequestFragmentSide {
                        account: first_account.clone(),
                        currency: base_cid.clone(),
                        amount: "1".to_string(),
                    }),
                    to: None,
                }],
                tags: vec![],
            });
            base_valid_json["fragments"][0]["field_other_than_from_to"] = json!({});

            let resp = driver_post_txn(
                Some(&token),
                TestBody::Bytes(Box::from(base_valid_json.to_string().as_bytes())),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_create_txn_extra_args_req_frag_side() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let first_account = bootstrap_post_account("My account", &token, &runtime.server).await;

            let mut base_valid_json = json!(PostTxnRequest {
                description: "my description".to_string(),
                title: "my title".to_string(),
                date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                fragments: vec![PostTxnRequestFragment {
                    from: Some(PostTxnRequestFragmentSide {
                        account: first_account.clone(),
                        currency: base_cid.clone(),
                        amount: "1".to_string(),
                    }),
                    to: None,
                }],
                tags: vec![],
            });
            base_valid_json["fragments"][0]["from"]["field_other_than_from_to"] = json!({});

            let resp = driver_post_txn(
                Some(&token),
                TestBody::Bytes(Box::from(base_valid_json.to_string().as_bytes())),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_create_txn_invalid_date() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let first_account = bootstrap_post_account("My account", &token, &runtime.server).await;

            let resp = driver_post_txn(
                Some(&token),
                TestBody::Expected(PostTxnRequest {
                    description: "my description".to_string(),
                    title: "my title".to_string(),
                    date_utc: "2025-01-01T01:02:00.000".to_string(),
                    fragments: vec![PostTxnRequestFragment {
                        from: Some(PostTxnRequestFragmentSide {
                            account: first_account.clone(),
                            currency: base_cid.clone(),
                            amount: "1".to_string(),
                        }),
                        to: None,
                    }],
                    tags: vec![],
                }),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_create_txn_frag_with_no_from_to() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;

            let resp = driver_post_txn(
                Some(&token),
                TestBody::Expected(PostTxnRequest {
                    description: "my description".to_string(),
                    title: "my title".to_string(),
                    date_utc: "2025-01-01T01:02:00.000".to_string(),
                    fragments: vec![PostTxnRequestFragment {
                        from: None,
                        to: None,
                    }],
                    tags: vec![],
                }),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_get_single_txn() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let first_account = bootstrap_post_account("My account", &token, &runtime.server).await;
            let first_tag = bootstrap_txn_tag("my tag", &token, &runtime.server).await;

            let txn_body = PostTxnRequest {
                description: "my description".to_string(),
                title: "my title".to_string(),
                date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                fragments: vec![PostTxnRequestFragment {
                    from: Some(PostTxnRequestFragmentSide {
                        account: first_account.clone(),
                        currency: base_cid.clone(),
                        amount: "1".to_string(),
                    }),
                    to: None,
                }],
                tags: vec![first_tag.clone()],
            };
            let decoy_txn_body = PostTxnRequest {
                description: "my description2".to_string(),
                title: "my title2".to_string(),
                date_utc: "2025-01-01T01:02:00.002Z".to_string(),
                fragments: vec![PostTxnRequestFragment {
                    from: Some(PostTxnRequestFragmentSide {
                        account: first_account.clone(),
                        currency: base_cid.clone(),
                        amount: "1".to_string(),
                    }),
                    to: None,
                }],
                tags: vec![first_tag],
            };

            // Post decoy txn
            driver_post_txn(
                Some(&token),
                TestBody::Expected(decoy_txn_body.clone()),
                &runtime.server,
                true,
            )
            .await
            .expected
            .unwrap();

            let txn_id = driver_post_txn(
                Some(&token),
                TestBody::Expected(txn_body.clone()),
                &runtime.server,
                true,
            )
            .await
            .expected
            .unwrap()
            .id;

            let resp = driver_get_txn(Some(&txn_id), Some(&token), &runtime.server, true).await;
            let resp_body = resp.expected.unwrap();
            assert_eq!(resp.status, StatusCode::OK);
            assert_eq!(resp_body.id, txn_id);
            assert_eq!(resp_body.date, txn_body.date_utc);
            assert_eq!(resp_body.description, txn_body.description);
            assert_eq!(resp_body.title, txn_body.title);
            assert_eq!(resp_body.tags.first(), txn_body.tags.first());
        }

        #[actix_web::test]
        async fn test_get_single_txn_no_token() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let first_account = bootstrap_post_account("My account", &token, &runtime.server).await;
            let first_tag = bootstrap_txn_tag("my tag", &token, &runtime.server).await;

            let txn_body = PostTxnRequest {
                description: "my description".to_string(),
                title: "my title".to_string(),
                date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                fragments: vec![PostTxnRequestFragment {
                    from: Some(PostTxnRequestFragmentSide {
                        account: first_account.clone(),
                        currency: base_cid.clone(),
                        amount: "1".to_string(),
                    }),
                    to: None,
                }],
                tags: vec![first_tag.clone()],
            };

            let txn_id = driver_post_txn(
                Some(&token),
                TestBody::Expected(txn_body.clone()),
                &runtime.server,
                true,
            )
            .await
            .expected
            .unwrap()
            .id;

            let resp = driver_get_txn(Some(&txn_id), None, &runtime.server, false).await;
            assert_eq!(resp.status, StatusCode::UNAUTHORIZED);
        }

        #[actix_web::test]
        async fn test_get_single_txn_invalid_uuid() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let random_uuid = Uuid::new_v4();
            let resp = driver_get_txn(Some(&format!("{random_uuid}2")), Some(&token), &runtime.server, false).await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_get_single_txn_unknown_uuid() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &runtime.server).await;
            let first_account = bootstrap_post_account("My account", &token, &runtime.server).await;
            let first_tag = bootstrap_txn_tag("my tag", &token, &runtime.server).await;

            let txn_body = PostTxnRequest {
                description: "my description".to_string(),
                title: "my title".to_string(),
                date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                fragments: vec![PostTxnRequestFragment {
                    from: Some(PostTxnRequestFragmentSide {
                        account: first_account.clone(),
                        currency: base_cid.clone(),
                        amount: "1".to_string(),
                    }),
                    to: None,
                }],
                tags: vec![first_tag.clone()],
            };

            let _txn_id = driver_post_txn(
                Some(&token),
                TestBody::Expected(txn_body.clone()),
                &runtime.server,
                true,
            )
            .await
            .expected
            .unwrap()
            .id;

            let random_uuid = Uuid::new_v4();
            let resp = driver_get_txn(Some(&format!("{random_uuid}")), Some(&token), &runtime.server, false).await;
            assert_eq!(resp.status, StatusCode::NOT_FOUND);
        }

    }
}
