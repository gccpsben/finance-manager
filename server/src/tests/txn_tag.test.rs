#[cfg(test)]
pub mod txn_tags {

    use crate::tests::commons::setup_connection;
    use crate::tests::commons::*;
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
        use crate::routes::txn_tags::create_tag::PostTxnTagRequestBody;
        use serde_json::json;

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
            )
        }

        #[actix_web::test]
        async fn test_post_txn_tags_empty_name() {
            let runtime = setup_connection().await;
            let token = bootstrap_token(("123", "123"), &runtime.server).await.token;
            let resp = driver_post_txn_tag(
                TestBody::Expected(PostTxnTagRequestBody {
                    name: "".to_string(),
                }),
                Some(&token),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::OK)
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
