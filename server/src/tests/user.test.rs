#[cfg(test)]
pub mod users {

    use crate::routes::users::login::LoginResponseBody;
    use crate::routes::users::register::PostUserRequestBody;
    use crate::routes::users::register::PostUserResponseBody;
    use crate::tests::commons::setup_connection;
    use crate::tests::commons::*;
    use crate::tests::user_tests::users::drivers::*;
    use actix_http::StatusCode;
    use actix_test::TestServer;
    use actix_web::http::header::ContentType;
    use serde_json::json;

    pub mod drivers {
        use std::str::FromStr;

        use uuid::Uuid;

        use super::*;

        pub(crate) struct TokenBootstrap {
            pub token: String,
            pub user_id: String,
        }

        impl TokenBootstrap {
            pub fn unwrap_token_uuid(&self) -> Uuid {
                Uuid::from_str(&self.token).unwrap()
            }
            pub fn unwrap_id_uuid(&self) -> Uuid {
                Uuid::from_str(&self.user_id).unwrap()
            }
            pub fn unwrap_auth_user(&self) -> crate::extractors::auth_user::AuthUser {
                crate::extractors::auth_user::AuthUser(self.unwrap_id_uuid())
            }
        }

        /// Quickly post user, login and return a token.
        /// This is useful for quickly setting up a test case.
        /// This function also perform `StatusCode == OK` assertions.
        pub async fn bootstrap_token(creds: (&str, &str), srv: &TestServer) -> TokenBootstrap {
            let user_1_creds = PostUserRequestBody {
                username: creds.0.to_string(),
                password: creds.1.to_string(),
            };
            // Post user
            let user_id = {
                driver_post_user(TestBody::Expected(user_1_creds.clone()), srv, true)
                    .await
                    .expected
                    .unwrap()
                    .id
            };
            let token = driver_login_user(TestBody::<(&str, &str)>::Expected(creds), srv, true)
                .await
                .expected
                .unwrap()
                .token;

            TokenBootstrap { token, user_id }
        }

        pub async fn driver_login_user(
            body: TestBody<(&str, &str)>,
            app: &TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<LoginResponseBody> {
            let mut req = app.post("/api/v1/auth/login");
            req = req.insert_header(ContentType::json());
            let mut res = send_req_with_body(req, body).await;
            let res_parsed: AssertTestResponse<LoginResponseBody> =
                parse_response_body(&mut res).await;
            if assert_default {
                assert_eq!(res.status(), StatusCode::OK);
            }
            res_parsed
        }

        pub async fn driver_post_user(
            body: TestBody<PostUserRequestBody>,
            app: &TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<PostUserResponseBody> {
            let mut req = app.post("/api/v1/auth/users");
            req = req.insert_header(ContentType::json());
            let mut res = send_req_with_body(req, body).await;
            let res_parsed: AssertTestResponse<PostUserResponseBody> =
                parse_response_body(&mut res).await;
            if assert_default {
                assert_eq!(res.status(), StatusCode::OK);
            }
            res_parsed
        }
    }

    mod tests {
        use super::*;

        #[actix_web::test]
        async fn test_valid_login_extra_fields() {
            let runtime = setup_connection().await;

            driver_post_user(
                TestBody::Expected(PostUserRequestBody {
                    username: String::from("123"),
                    password: String::from("1234"),
                }),
                &runtime.server,
                true,
            )
            .await;

            // Login with correct creds, but with extra fields
            let resp = driver_login_user(
                TestBody::<(&str, &str)>::Bytes(Box::from(
                    json!({
                        "username": "123",
                        "password": "1234",
                        "extra_field": "123"
                    })
                    .to_string()
                    .as_bytes(),
                )),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_login_empty_username() {
            let runtime = setup_connection().await;
            let resp = driver_post_user(
                TestBody::Bytes(Box::from("".as_bytes())),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_login_no_username_field() {
            let runtime = setup_connection().await;
            let resp = driver_post_user(
                TestBody::Bytes(Box::from(
                    json!({
                        "password": "1231"
                    })
                    .to_string()
                    .as_bytes(),
                )),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_login_empty_password() {
            let runtime = setup_connection().await;
            let resp = driver_post_user(
                TestBody::Bytes(Box::from(
                    json!({
                        "username": "123"
                    })
                    .to_string()
                    .as_bytes(),
                )),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_login_no_password_field() {
            let runtime = setup_connection().await;
            let resp = driver_post_user(
                TestBody::Bytes(Box::from(
                    json!({
                        "username": "1231"
                    })
                    .to_string()
                    .as_bytes(),
                )),
                &runtime.server,
                false,
            )
            .await;
            assert_eq!(resp.status, StatusCode::BAD_REQUEST);
        }

        #[actix_web::test]
        async fn test_successful_logins() {
            let runtime = setup_connection().await;
            // Post user correctly
            {
                driver_post_user(
                    TestBody::Expected(PostUserRequestBody {
                        username: String::from("123"),
                        password: String::from("1234"),
                    }),
                    &runtime.server,
                    true,
                )
                .await;
                driver_post_user(
                    TestBody::Expected(PostUserRequestBody {
                        username: String::from("1234"),
                        password: String::from("123"),
                    }),
                    &runtime.server,
                    true,
                )
                .await;
            }

            // Login correctly
            {
                driver_login_user(
                    TestBody::<(&str, &str)>::Bytes(Box::from(
                        json!({
                            "username": "1234",
                            "password": "123"
                        })
                        .to_string()
                        .as_bytes(),
                    )),
                    &runtime.server,
                    true,
                )
                .await;
            }

            // Login correctly
            {
                driver_login_user(
                    TestBody::<(&str, &str)>::Bytes(Box::from(
                        json!({
                            "username": "123",
                            "password": "1234"
                        })
                        .to_string()
                        .as_bytes(),
                    )),
                    &runtime.server,
                    true,
                )
                .await;
            }
        }

        #[actix_web::test]
        async fn test_invalid_logins() {
            let runtime = setup_connection().await;

            // Post user correctly
            {
                driver_post_user(
                    TestBody::Expected(PostUserRequestBody {
                        username: String::from("123"),
                        password: String::from("1234"),
                    }),
                    &runtime.server,
                    true,
                )
                .await;
                driver_post_user(
                    TestBody::Expected(PostUserRequestBody {
                        username: String::from("1234"),
                        password: String::from("123"),
                    }),
                    &runtime.server,
                    true,
                )
                .await;
            }

            let bad_reqs: Vec<TestBody<(&str, &str)>> = vec![
                TestBody::Bytes(Box::from([1, 2, 3, 4, 5])),
                TestBody::Bytes(Box::from([])),
                TestBody::Bytes(Box::from([0])),
                TestBody::Bytes(Box::from("".to_string().as_bytes())),
                TestBody::Bytes(Box::from("1".to_string().as_bytes())),
                TestBody::Bytes(Box::from("{".to_string().as_bytes())),
                TestBody::Bytes(Box::from("{}".to_string().as_bytes())),
                TestBody::Bytes(Box::from("}".to_string().as_bytes())),
                TestBody::Bytes(Box::from("'".to_string().as_bytes())),
                TestBody::Bytes(Box::from("\"\"".to_string().as_bytes())),
                TestBody::Bytes(Box::from("あ".to_string().as_bytes())),
            ];

            // All items in `bad_reqs` should fail.
            for (count, test_item) in bad_reqs.into_iter().enumerate() {
                let resp = driver_login_user(test_item, &runtime.server, false).await;
                assert_eq!(
                    resp.status,
                    StatusCode::BAD_REQUEST,
                    "test_invalid_logins: expect item at index {} to fail.",
                    count
                );
            }

            let unauth: Vec<TestBody<(&str, &str)>> = vec![
                TestBody::Expected(("123", "1 2 3")),
                TestBody::Expected(("123", "1 23")),
                TestBody::Expected(("1234", "1234")),
                TestBody::Expected(("1 34", "12 4")),
                TestBody::Expected(("1234", "")),
                TestBody::Expected(("", "1234")),
            ];

            // All items in `bad_reqs` should fail.
            for (count, test_item) in unauth.into_iter().enumerate() {
                let resp = driver_login_user(test_item, &runtime.server, false).await;
                assert_eq!(
                    resp.status,
                    StatusCode::UNAUTHORIZED,
                    "test_invalid_logins: expect item at index {} to fail.",
                    count
                );
            }
        }
    }
}
