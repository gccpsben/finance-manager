#[cfg(test)]
pub mod txn_tags {

    use crate::tests::commons::requests::AssertTestResponse;
    use crate::tests::commons::requests::TestBody;
    use crate::tests::commons::requests::attach_token_to_req;
    use crate::tests::commons::requests::parse_response_body;
    use crate::tests::commons::requests::send_req_with_body;
    use crate::tests::commons::setups::setup_connection;
    use crate::tests::user_tests::users::drivers::*;
    use actix_http::StatusCode;
    use actix_web::http::header::ContentType;

    pub mod drivers {
        use super::*;
        use crate::routes::txn_tags::{
            create_tag::{PostTxnTagRequestBody, PostTxnTagResponseBody},
            get_tags::GetTxnTagsResponseBody,
        };
        use actix_test::TestServer;

        pub async fn driver_post_txn_tag(
            body: TestBody<PostTxnTagRequestBody>,
            token: Option<&str>,
            app: &TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<PostTxnTagResponseBody> {
            let mut req = app.post("/api/v1/txnTags");
            req = req.insert_header(ContentType::json());
            req = attach_token_to_req(req, token);
            let mut res = send_req_with_body(req, body).await;
            let res_parsed: AssertTestResponse<PostTxnTagResponseBody> =
                parse_response_body(&mut res).await;
            if assert_default {
                assert_eq!(res.status(), StatusCode::OK);
            }
            res_parsed
        }

        pub async fn driver_get_txn_tags(
            token: Option<&str>,
            app: &TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<GetTxnTagsResponseBody> {
            let mut req = app.get("/api/v1/txnTags");
            req = req.insert_header(ContentType::json());
            req = attach_token_to_req(req, token);
            let mut res = req
                .send()
                .await
                .expect("Failed sending get txn tags request.");
            let res_parsed: AssertTestResponse<GetTxnTagsResponseBody> =
                parse_response_body(&mut res).await;
            if assert_default {
                assert_eq!(res.status(), StatusCode::OK);
            }
            res_parsed
        }

        pub async fn bootstrap_txn_tag(tag_name: &str, token: &str, srv: &TestServer) -> String {
            driver_post_txn_tag(
                TestBody::Expected(crate::routes::txn_tags::create_tag::PostTxnTagRequestBody {
                    name: tag_name.to_string(),
                }),
                Some(token),
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
        use super::{
            drivers::{driver_get_txn_tags, driver_post_txn_tag},
            *,
        };
        use crate::{
            extended_models::txn_tag::TxnTagId, routes::txn_tags::create_tag::PostTxnTagRequestBody,
        };
        use serde_json::json;
        use uuid::Uuid;

        /// Test if the txn tags endpoint is actually using the cache.
        #[actix_web::test]
        async fn test_post_txn_tags_cache() {
            let runtime = setup_connection().await;
            let server = runtime.server;
            let states = runtime.states;
            let u1 = bootstrap_token(("123", "123"), &server).await;
            let u1_auth = u1.unwrap_auth_user();
            let txn_tag_name_for_test = "My Tag".to_string();

            // Check if cache is empty
            {
                let mut cache_lock = states.txn_tags_cache.lock().await;
                assert!(cache_lock.0.get_user_entry_mut(&u1_auth).is_none());
                drop(cache_lock);
            }

            // Post txn tag via API
            let posted_tag_id = {
                Uuid::parse_str(
                    &driver_post_txn_tag(
                        TestBody::Expected(PostTxnTagRequestBody {
                            name: txn_tag_name_for_test.clone(),
                        }),
                        Some(&u1.token),
                        &server,
                        true,
                    )
                    .await
                    .expected
                    .expect("the returned resp is not expected at posted_tag_id")
                    .id,
                )
                .expect("cannot parse uuid at posted_tag_id")
            };

            // Ensure new entry created in txn tags cache
            {
                let mut cache_lock = states.txn_tags_cache.lock().await;
                assert_eq!(cache_lock.0.get_user_entry_mut(&u1_auth).unwrap().len(), 1);
            }

            // Trigger a full reload of user's txn tags
            // This should set the cache state to FULL
            {
                let tags = driver_get_txn_tags(Some(&u1.token), &server, true)
                    .await
                    .expected
                    .unwrap()
                    .tags;
                assert_eq!(tags.first().unwrap().name, txn_tag_name_for_test);
            }

            // Modify the data in cached txn tag directly.
            // This should not change the state of the cache away from FULL.
            {
                let mut cache_lock = states.txn_tags_cache.lock().await;
                cache_lock.0.register(
                    &u1_auth,
                    &TxnTagId(posted_tag_id),
                    crate::entities::txn_tag::Model {
                        id: posted_tag_id,
                        owner_id: u1_auth.0,
                        name: "THIS IS A NEW NAME THAT IS MODIFIED".to_string(),
                    },
                );
            }

            // After modified the newly created txn tags in cache, but not the db.
            // we should see difference in cache and db.
            let txn_tag_name_via_endpoint = driver_get_txn_tags(Some(&u1.token), &server, true)
                .await
                .expected
                .unwrap()
                .tags
                .first()
                .unwrap()
                .name
                .clone();
            assert_ne!(
                txn_tag_name_via_endpoint, txn_tag_name_for_test,
                "txn tag name still the same after modifying cache"
            );
        }

        #[actix_web::test]
        async fn test_post_txn_tags_extra_fields() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let mut base_valid_json = json!(PostTxnTagRequestBody {
                name: "My Tag".to_string(),
            });
            base_valid_json["extra_field"] = json!("test");

            let resp = driver_post_txn_tag(
                TestBody::Bytes(base_valid_json.to_string().as_bytes().into()),
                Some(&token),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_post_txn_tags_empty_json() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;

            let resp = driver_post_txn_tag(
                TestBody::Bytes(json!({}).to_string().as_bytes().into()),
                Some(&token),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_get_txn_tags_no_token() {
            let runtime = setup_connection().await;
            let _ = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let resp = driver_get_txn_tags(None, &runtime.server, false).await;
            assert_eq!(
                resp.status,
                StatusCode::UNAUTHORIZED,
                "Get posted txn tags without token"
            );
        }

        #[actix_web::test]
        async fn test_post_txn_tags_no_token() {
            let runtime = setup_connection().await;
            let _ = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let resp = driver_post_txn_tag(
                TestBody::Expected(PostTxnTagRequestBody {
                    name: "My Tag".to_string(),
                }),
                None,
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(
                resp.status,
                StatusCode::UNAUTHORIZED,
                "Create valid txn tag without token"
            );
        }

        #[actix_web::test]
        async fn test_post_txn_tags_empty_name() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let resp = driver_post_txn_tag(
                TestBody::Expected(PostTxnTagRequestBody {
                    name: String::new(),
                }),
                Some(&token),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::OK);
        }

        #[actix_web::test]
        async fn test_post_get_valid_txn_tags() {
            let runtime = setup_connection().await;
            let user_1_creds = bootstrap_token(("123", "123"), &runtime.server).await;

            driver_post_txn_tag(
                TestBody::Expected(PostTxnTagRequestBody {
                    name: "My Tag".to_string(),
                }),
                Some(&user_1_creds.token),
                &runtime.server,
                true,
            )
            .await;

            {
                let resp =
                    driver_get_txn_tags(Some(&user_1_creds.token), &runtime.server, true).await;
                assert_eq!(
                    resp.status,
                    StatusCode::OK,
                    "Get posted txn tags with token"
                );
                let expected_content = resp.expected.unwrap();
                assert_eq!(
                    expected_content.tags.len(),
                    1,
                    "Get posted txn tags with token"
                );
                assert_eq!(
                    expected_content.tags.first().unwrap().name,
                    "My Tag",
                    "Get posted txn tags with token"
                );
            }
        }
    }
}
