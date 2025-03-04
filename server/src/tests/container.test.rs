#[cfg(test)]
pub mod containers {

    use crate::routes::users::register::PostUserRequestBody;
    use crate::routes::containers::get_container::GetContainerResponse;
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
        use super::*;
        pub async fn driver_get_containers(
            target_id: Option<&str>,
            token: Option<&str>,
            app: &actix_test::TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<GetContainerResponse> {
            let mut req = app.get("/containers");
            if let Some(target_id) = target_id {
                req = req.query(&[("id", target_id)]).unwrap();
            }
            req = req.insert_header(ContentType::json());
            req = attach_token_to_req(req, token);
            let mut res = req.send().await.unwrap();
            let res_parsed: AssertTestResponse<GetContainerResponse> =
                parse_response_body(&mut res).await;
            if assert_default {
                assert_eq!(res.status(), StatusCode::OK);
            }
            res_parsed
        }

        pub async fn driver_post_container(
            token: Option<&str>,
            body: TestBody<PostContainerRequestBody>,
            app: &actix_test::TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<PostContainerResponseBody> {
            let mut req = app.post("/containers");
            req = attach_token_to_req(req, token);
            req = req.insert_header(ContentType::json());
            let mut res = send_req_with_body(req, body).await;
            let res_parsed: AssertTestResponse<PostContainerResponseBody> =
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
        async fn test_curd_containers() {
            let srv = setup_connection().await;
            let first_usr_token = bootstrap_token(("123", "123"), &srv).await;
            let second_usr_token = bootstrap_token(("1234", "1234"), &srv).await;

            let first_user_container_1_id = {
                let resp = driver_post_container(
                    Some(&first_usr_token),
                    TestBody::Expected(PostContainerRequestBody {
                        container_name: String::from("container 1"),
                    }),
                    &srv,
                    true,
                )
                .await;
                resp.expected.unwrap().container_id
            };

            let first_user_container_2_id = {
                let resp = driver_post_container(
                    Some(&first_usr_token),
                    TestBody::Expected(PostContainerRequestBody {
                        container_name: String::from("container 2"),
                    }),
                    &srv,
                    true,
                )
                .await;
                resp.expected.unwrap().container_id
            };

            let second_user_container_1_id = {
                let resp = driver_post_container(
                    Some(&second_usr_token),
                    TestBody::Expected(PostContainerRequestBody {
                        container_name: String::from("container 1"),
                    }),
                    &srv,
                    true,
                )
                .await;
                resp.expected.unwrap().container_id
            };

            // Get all containers of user 1
            {
                let resp = driver_get_containers(None, Some(&first_usr_token), &srv, true).await;
                assert_eq!(
                    resp.expected.unwrap().items.len(),
                    2,
                    "Containers of user 1 should be 2."
                );
            }

            // Get all containers of user 2
            {
                let resp = driver_get_containers(None, Some(&second_usr_token), &srv, true).await;
                assert_eq!(
                    resp.expected.unwrap().items.len(),
                    1,
                    "Containers of user 2 should be 1."
                );
            }

            // Get the first container of user 1
            {
                let resp = driver_get_containers(
                    Some(&first_user_container_1_id),
                    Some(&first_usr_token),
                    &srv,
                    true,
                )
                .await;
                let actual_items = resp.expected.unwrap().items;
                assert_eq!(
                    actual_items.len(),
                    1,
                    "Get the first container of user 1: length should be 1"
                );
                assert_eq!(
                    actual_items.first().unwrap().container_id,
                    first_user_container_1_id,
                    "Get the first container of user 1: id should match"
                );
            }

            // Get the first container of user 2
            {
                let resp = driver_get_containers(
                    Some(&second_user_container_1_id),
                    Some(&second_usr_token),
                    &srv,
                    true,
                )
                .await;
                let actual_items = resp.expected.unwrap().items;
                assert_eq!(
                    actual_items.len(),
                    1,
                    "Get the first container of user 2: length should be 1"
                );
                assert_eq!(
                    actual_items.first().unwrap().container_id,
                    second_user_container_1_id,
                    "Get the first container of user 2: id should match"
                );
            }

            // Get all containers without token
            {
                let resp = driver_get_containers(None, None, &srv, false).await;
                assert_eq!(
                    resp.status,
                    StatusCode::UNAUTHORIZED,
                    "Get all containers without token"
                );
            }

            // Get any container without token
            {
                let resp =
                    driver_get_containers(Some(&first_user_container_1_id), None, &srv, false).await;
                assert_eq!(
                    resp.status,
                    StatusCode::UNAUTHORIZED,
                    "Get any container without token"
                );
            }

            // Get containers of others
            {
                let resp = driver_get_containers(
                    Some(&first_user_container_1_id),
                    Some(&second_usr_token),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(
                    resp.expected.unwrap().items.len(),
                    0,
                    "Get containers of others: should return 0 item."
                );
            }
        }
    }
}
