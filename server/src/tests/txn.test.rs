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

    pub mod drivers {

        use super::*;

        pub async fn driver_post_txn(
            token: Option<&str>,
            body: TestBody<PostTxnRequest>,
            app: &actix_test::TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<PostTxnResponse> {
            let mut req = app.post("/txns");
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
            let mut req = app.get("/txns");
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
    }

    mod tests {

        use super::drivers::driver_get_txns;
        use super::drivers::driver_post_txn;
        use super::*;
        use crate::routes::txns::post_txns::PostTxnRequestFragment;
        use crate::routes::txns::post_txns::PostTxnRequestFragmentSide;
        use crate::tests::account_tests::accounts::drivers::bootstrap_post_account;
        use crate::tests::commons::setup_connection;
        use crate::tests::currency_tests::currencies::drivers::bootstrap_base_curr;
        use crate::tests::currency_tests::currencies::drivers::bootstrap_sec_curr;
        use crate::tests::user_tests::users::drivers::bootstrap_token;

        #[actix_web::test]
        async fn test_curd_txns() {
            let srv = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &srv).await;
            let base_cid = bootstrap_base_curr(("BASE", "Base"), &token, &srv).await;
            let _sec_cid =
                bootstrap_sec_curr(("Sec", "Sec Curr"), "5", base_cid.as_str(), &token, &srv).await;
            let first_account = bootstrap_post_account("My account", &token, &srv).await;

            let first_txn_to_post = PostTxnRequest {
                description: "my description".to_string(),
                title: "my title 1".to_string(),
                date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                fragments: vec![PostTxnRequestFragment {
                    from: Some(PostTxnRequestFragmentSide {
                        account: first_account.clone(),
                        currency: base_cid.clone(),
                        amount: "1".to_string(),
                    }),
                    to: None,
                }],
            };

            let second_txn_to_post = PostTxnRequest {
                description: "my description".to_string(),
                title: "my title 2".to_string(),
                date_utc: "2025-02-01T01:02:00.000Z".to_string(),
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
            };

            // Creating valid txn (single fragment)
            driver_post_txn(
                Some(&token),
                TestBody::Expected(first_txn_to_post.clone()),
                &srv,
                true,
            )
            .await;

            // Creating valid txn (multiple fragments)
            driver_post_txn(
                Some(&token),
                TestBody::Expected(second_txn_to_post.clone()),
                &srv,
                true,
            )
            .await;

            // Getting the created txns
            {
                let resp = driver_get_txns(Some(&token), &srv, true).await;
                let txns = resp.expected.expect("returned items not empty");
                assert_eq!(txns.items.len(), 2, "expect there are 2 items");

                txns.items.clone().sort_by_key(|x| x.date.clone());
                let item_0 = txns.items.first().unwrap();
                let item_1 = txns.items.get(1).unwrap();

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

                assert_eq!(item_1.fragments.len(), 2);
            }

            // Txn referencing unknown account
            {
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
                    }),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(resp.status, StatusCode::NOT_FOUND);
            }

            // Txn referencing unknown currency
            {
                let resp = driver_post_txn(
                    Some(&token),
                    TestBody::Expected(PostTxnRequest {
                        description: "my description".to_string(),
                        title: "my title".to_string(),
                        date_utc: "2025-01-01T01:02:00.000Z".to_string(),
                        fragments: vec![PostTxnRequestFragment {
                            from: Some(PostTxnRequestFragmentSide {
                                account: format!(
                                    "{}A1234",
                                    &first_account[0..first_account.len() - 5]
                                ),
                                currency: base_cid.clone(),
                                amount: "1".to_string(),
                            }),
                            to: None,
                        }],
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
