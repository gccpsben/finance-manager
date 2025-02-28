#[cfg(test)]
mod containers {

    use crate::routes::containers::post_container::*;
    use crate::tests::commons::TestBody;
    use crate::tests::commons::*;
    use crate::tests::user_tests::users::drivers::*;
    use actix_http::{Request, StatusCode};
    use actix_web::body::MessageBody;
    use actix_web::{
        dev::{Service, ServiceResponse},
        http::{header::ContentType, Method},
        test::{self},
    };
    use drivers::*;

    mod drivers {

        use crate::routes::containers::get_container::GetContainerResponse;

        use super::*;

        pub async fn driver_get_containers<E: std::fmt::Debug, const ASSERT_DEFAULT: bool>(
            token: &str,
            target_id: Option<&str>,
            app: &impl Service<Request, Response = ServiceResponse<impl MessageBody>, Error = E>,
        ) -> AssertTestResponse<GetContainerResponse> {
            let mut req = test::TestRequest::default();
            req = req.insert_header(ContentType::json());
            req = req.insert_header(("authorization", token));
            req = match target_id {
                None => req.uri("/containers"),
                Some(target_id) => req.uri(&format!("/containers?id={}", target_id)),
            };
            req = req.method(Method::GET);
            let res = test::call_service(app, req.to_request()).await;
            let res_parsed = parse_response_body(res).await;
            if ASSERT_DEFAULT {
                assert_eq!(res_parsed.status, StatusCode::OK);
                assert!(res_parsed.expected.is_some());
            }
            res_parsed
        }

        pub async fn driver_post_container<
            B: MessageBody,
            E: std::fmt::Debug,
            const ASSERT_DEFAULT: bool,
        >(
            body: TestBody<PostContainerRequestBody>,
            token: &str,
            app: &impl Service<Request, Response = ServiceResponse<B>, Error = E>,
        ) -> AssertTestResponse<PostContainerResponseBody> {
            let mut req = test::TestRequest::default();
            req = req.insert_header(ContentType::json());
            req = req.insert_header(("authorization", token));
            req = match body {
                TestBody::Serialize(seral) => req.set_json(seral),
                TestBody::Expected(expected_body) => req.set_json(expected_body),
            };
            req = req.uri("/containers");
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
        async fn test_post_container() {
            let app = setup_connection().await;

            let user_1 = PostUserRequestBody {
                username: String::from("USER_1"),
                password: String::from("PW_1"),
            };
            let user_2 = PostUserRequestBody {
                username: String::from("USER_2"),
                password: String::from("PW_2"),
            };

            // Post user 1
            let _first_user_id = {
                let resp =
                    driver_post_user::<_, _, true>(TestBody::Expected(user_1.clone()), &app).await;
                resp.expected.unwrap().id
            };

            // Post user 2
            let _second_user_id = {
                let resp =
                    driver_post_user::<_, _, true>(TestBody::Expected(user_2.clone()), &app).await;
                resp.expected.unwrap().id
            };

            let first_user_token = {
                let resp = driver_login_user::<_, _, true>(
                    TestBody::<(&str, &str)>::Expected((&user_1.username, &user_1.password)),
                    &app,
                )
                .await;
                resp.expected.unwrap().token
            };

            let second_user_token = {
                let resp = driver_login_user::<_, _, true>(
                    TestBody::<(&str, &str)>::Expected((&user_2.username, &user_2.password)),
                    &app,
                )
                .await;
                resp.expected.unwrap().token
            };

            let first_user_container_1_id = {
                let resp = driver_post_container::<_, _, true>(
                    TestBody::Expected(PostContainerRequestBody {
                        container_name: String::from("container 1"),
                    }),
                    &first_user_token,
                    &app,
                )
                .await;
                resp.expected.unwrap().container_id
            };

            let _first_user_container_2_id = {
                let resp = driver_post_container::<_, _, true>(
                    TestBody::Expected(PostContainerRequestBody {
                        container_name: String::from("container 2"),
                    }),
                    &first_user_token,
                    &app,
                )
                .await;
                resp.expected.unwrap().container_id
            };

            let _second_user_container_1_id = {
                let resp = driver_post_container::<_, _, true>(
                    TestBody::Expected(PostContainerRequestBody {
                        container_name: String::from("container 1"),
                    }),
                    &second_user_token,
                    &app,
                )
                .await;
                resp.expected.unwrap().container_id
            };

            // Get all containers of user 1
            {
                let resp = driver_get_containers::<_, true>(&first_user_token, None, &app).await;
                assert_eq!(resp.expected.unwrap().items.len(), 2);
            }

            // Get all containers of user 2
            {
                let resp = driver_get_containers::<_, true>(&second_user_token, None, &app).await;
                assert_eq!(resp.expected.unwrap().items.len(), 1);
            }

            // Get user 1 first container
            {
                let resp = driver_get_containers::<_, true>(
                    &first_user_token,
                    Some(&first_user_container_1_id),
                    &app,
                )
                .await;
                assert_eq!(resp.expected.unwrap().items.len(), 1);
            }

            // Get all containers without token
            {
                let resp = driver_get_containers::<_, false>("", None, &app).await;
                assert_eq!(resp.status, StatusCode::UNAUTHORIZED);
            }

            // Get container of others
            {
                let resp = driver_get_containers::<_, true>(
                    &second_user_token,
                    Some(&first_user_container_1_id),
                    &app,
                )
                .await;
                assert_eq!(resp.expected.unwrap().items.len(), 0);
            }
        }
    }
}
