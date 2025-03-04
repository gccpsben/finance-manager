#[cfg(test)]
pub mod users {

    use crate::routes::users::register::PostUserRequestBody;
    use crate::routes::users::register::PostUserResponseBody;
    use crate::tests::commons::*;
    use crate::tests::user_tests::users::drivers::*;
    use crate::{routes::users::login::LoginResponseBody, tests::commons::setup_connection};
    use actix_http::{Request, StatusCode};
    use actix_test::TestServer;
    use actix_web::body::MessageBody;
    use actix_web::{
        dev::{Service, ServiceResponse},
        http::{header::ContentType, Method},
        test::{self},
    };
    use serde_json::json;

    pub mod drivers {
        use super::*;

        /// Quickly post user, login and return a token.
        /// This is useful for quickly setting up a test case.
        /// This function also perform `StatusCode == OK` assertions.
        pub async fn bootstrap_token(creds: (&str, &str), srv: &TestServer) -> String {
            let user_1_creds = PostUserRequestBody {
                password: creds.0.to_string(),
                username: creds.1.to_string(),
            };
            // Post user
            let _user_1_id = {
                driver_post_user(TestBody::Expected(user_1_creds.clone()), srv, true)
                    .await
                    .expected
                    .unwrap()
                    .id
            };
            driver_login_user(TestBody::<(&str, &str)>::Expected(creds), srv, true)
                .await
                .expected
                .unwrap()
                .token
        }

        pub async fn driver_login_user(
            body: TestBody<(&str, &str)>,
            app: &TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<LoginResponseBody> {
            let mut req = app.post("/login");
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
            let mut req = app.post("/users");
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
        async fn test_malformed_logins() {
            let app = setup_connection().await;

            // Post user - empty
            {
                let resp =
                    driver_post_user(TestBody::Bytes(Box::from("".as_bytes())), &app, false).await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }

            // Post user - no username
            {
                let resp = driver_post_user(
                    TestBody::Bytes(Box::from(
                        json!({
                            "password": "1231"
                        })
                        .to_string()
                        .as_bytes(),
                    )),
                    &app,
                    false,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }

            // Post user - no password
            {
                let resp = driver_post_user(
                    TestBody::Bytes(Box::from(
                        json!({
                            "username": "123"
                        })
                        .to_string()
                        .as_bytes(),
                    )),
                    &app,
                    false,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }
        }

        #[actix_web::test]
        async fn test_successful_logins() {
            let app = setup_connection().await;
            // Post user correctly
            {
                let resp = driver_post_user(
                    TestBody::Expected(PostUserRequestBody {
                        username: String::from("123"),
                        password: String::from("1234"),
                    }),
                    &app,
                    true,
                )
                .await;
                let resp = driver_post_user(
                    TestBody::Expected(PostUserRequestBody {
                        username: String::from("1234"),
                        password: String::from("123"),
                    }),
                    &app,
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
                    &app,
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
                    &app,
                    true,
                )
                .await;
            }
        }

        #[actix_web::test]
        async fn test_invalid_logins() {
            let app = setup_connection().await;

            // Post user correctly
            {
                let resp = driver_post_user(
                    TestBody::Expected(PostUserRequestBody {
                        username: String::from("123"),
                        password: String::from("1234"),
                    }),
                    &app,
                    true,
                )
                .await;
                let resp = driver_post_user(
                    TestBody::Expected(PostUserRequestBody {
                        username: String::from("1234"),
                        password: String::from("123"),
                    }),
                    &app,
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
                let resp = driver_login_user(test_item, &app, false).await;
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
                let resp = driver_login_user(test_item, &app, false).await;
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
