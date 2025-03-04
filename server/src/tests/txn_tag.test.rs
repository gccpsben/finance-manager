#[cfg(test)]
pub mod txn_tags {

    use crate::routes::users::register::PostUserRequestBody;
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
            let mut req = app.post("/txnTags");
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
            let mut req = app.get("/txnTags");
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
    }

    mod tests {
        use super::{
            drivers::{driver_get_txn_tags, driver_post_txn_tag},
            *,
        };

        #[actix_web::test]
        async fn test_curd_txn_tags() {
            let srv = setup_connection().await;
            let user_1_creds = PostUserRequestBody {
                password: String::from("123"),
                username: String::from("123"),
            };

            // Post user
            let _user_1_id = {
                driver_post_user(TestBody::Expected(user_1_creds.clone()), &srv, true)
                    .await
                    .expected
                    .unwrap()
                    .id
            };

            // Login
            let user_1_token = {
                driver_login_user(
                    TestBody::<(&str, &str)>::Expected(("123", "123")),
                    &srv,
                    true,
                )
                .await
                .expected
                .unwrap()
                .token
            };

            {
                let resp = driver_post_txn_tag(
                    TestBody::Expected(
                        crate::routes::txn_tags::create_tag::PostTxnTagRequestBody {
                            name: "My Tag".to_string(),
                        },
                    ),
                    None,
                    &srv,
                    false,
                )
                .await;
                assert_eq!(
                    resp.status,
                    StatusCode::UNAUTHORIZED,
                    "Create valid txn tag without token"
                )
            }

            {
                let resp = driver_post_txn_tag(
                    TestBody::Bytes(Box::from("{}".as_bytes())),
                    Some(&user_1_token),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(
                    resp.status,
                    StatusCode::BAD_REQUEST,
                    "Create valid txn tag without name"
                )
            }

            // Create valid txn tag
            driver_post_txn_tag(
                TestBody::Expected(crate::routes::txn_tags::create_tag::PostTxnTagRequestBody {
                    name: "My Tag".to_string(),
                }),
                Some(&user_1_token),
                &srv,
                true,
            )
            .await;

            {
                let resp = driver_get_txn_tags(None, &srv, false).await;
                assert_eq!(
                    resp.status,
                    StatusCode::UNAUTHORIZED,
                    "Get posted txn tags without token"
                );
            }

            {
                let resp = driver_get_txn_tags(Some(&user_1_token), &srv, true).await;
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
