#[cfg(test)]
pub mod users {

    use crate::routes::users::register::PostUserResponseBody;
    use crate::tests::commons::*;
    use crate::tests::user_tests::users::drivers::*;
    use crate::{routes::users::login::LoginResponseBody, tests::commons::setup_connection};
    use actix_http::{Request, StatusCode};
    use actix_web::body::MessageBody;
    use actix_web::{
        dev::{Service, ServiceResponse},
        http::{header::ContentType, Method},
        test::{self},
    };
    use serde_json::json;

    pub mod drivers {
        use crate::routes::users::register::PostUserRequestBody;

        use super::*;
        pub async fn driver_login_user<
            B: MessageBody,
            E: std::fmt::Debug,
            const ASSERT_DEFAULT: bool,
        >(
            body: TestBody<(&str, &str)>,
            app: &impl Service<Request, Response = ServiceResponse<B>, Error = E>,
        ) -> AssertTestResponse<LoginResponseBody> {
            let mut req = test::TestRequest::default();
            req = req.insert_header(ContentType::json());
            req = match body {
                TestBody::Serialize(seral) => req.set_json(seral),
                TestBody::Expected(tuple) => req.set_json(json!({
                    "username": tuple.0,
                    "password": tuple.1,
                })),
            };
            req = req.uri("/login");
            req = req.method(Method::POST);
            let res = test::call_service(app, req.to_request()).await;
            let res_parsed = parse_response_body(res).await;
            if ASSERT_DEFAULT {
                assert_eq!(res_parsed.status, StatusCode::OK);
                assert!(res_parsed.expected.is_some());
            }
            res_parsed
        }

        pub async fn driver_post_user<
            B: MessageBody,
            E: std::fmt::Debug,
            const ASSERT_DEFAULT: bool,
        >(
            body: TestBody<PostUserRequestBody>,
            app: &impl Service<Request, Response = ServiceResponse<B>, Error = E>,
        ) -> AssertTestResponse<PostUserResponseBody> {
            let mut req = test::TestRequest::default();
            req = req.insert_header(ContentType::json());
            req = match body {
                TestBody::Serialize(seral) => req.set_json(seral),
                TestBody::Expected(expected_body) => req.set_json(expected_body),
            };
            req = req.uri("/users");
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
        use crate::routes::users::register::PostUserRequestBody;

        use super::*;
        #[actix_web::test]
        async fn test_login_post_user() {
            let app = setup_connection().await;

            // Post user - empty
            {
                let resp =
                    driver_post_user::<_, _, false>(TestBody::Serialize(json!({})), &app).await;
                assert!(resp.status == StatusCode::BAD_REQUEST);
            }

            // Post user - no username
            {
                let resp = driver_post_user::<_, _, false>(
                    TestBody::Serialize(json!({
                        "password": "123"
                    })),
                    &app,
                )
                .await;
                assert!(resp.status == StatusCode::BAD_REQUEST);
            }

            // Post user - no password
            {
                let resp = driver_post_user::<_, _, false>(
                    TestBody::Serialize(json!({
                        "username": "123",
                    })),
                    &app,
                )
                .await;
                assert!(resp.status == StatusCode::BAD_REQUEST);
            }

            // Post user correctly
            {
                driver_post_user::<_, _, true>(
                    TestBody::Expected(PostUserRequestBody {
                        username: String::from("123"),
                        password: String::from("123"),
                    }),
                    &app,
                )
                .await;
            }

            // Login incorrectly
            {
                let resp = driver_login_user::<_, _, false>(
                    TestBody::<(&str, &str)>::Serialize(json!({
                        "username": "123",
                        "password": "1231"
                    })),
                    &app,
                )
                .await;
                assert!(resp.status == StatusCode::UNAUTHORIZED);
            }

            // Login correctly
            {
                driver_login_user::<_, _, true>(
                    TestBody::<(&str, &str)>::Serialize(json!({
                        "username": "123",
                        "password": "123"
                    })),
                    &app,
                )
                .await;
            }
        }
    }
}
