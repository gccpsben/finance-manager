#[cfg(test)]
pub mod accounts {

    use crate::routes::accounts::get_account::GetAccountResponse;
    use crate::routes::accounts::post_account::*;
    use crate::tests::commons::TestBody;
    use crate::tests::commons::*;
    use crate::tests::user_tests::users::drivers::*;
    use actix_http::StatusCode;
    use actix_web::http::header::ContentType;
    use drivers::*;

    mod drivers {

        use super::*;
        pub async fn driver_get_accounts(
            target_id: Option<&str>,
            token: Option<&str>,
            app: &actix_test::TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<GetAccountResponse> {
            let mut req = app.get("/accounts");
            if let Some(target_id) = target_id {
                req = req.query(&[("id", target_id)]).unwrap();
            }
            req = req.insert_header(ContentType::json());
            req = attach_token_to_req(req, token);
            let mut res = req.send().await.unwrap();
            let res_parsed: AssertTestResponse<GetAccountResponse> =
                parse_response_body(&mut res).await;
            if assert_default {
                assert_eq!(res.status(), StatusCode::OK);
            }
            res_parsed
        }

        pub async fn driver_post_account(
            token: Option<&str>,
            body: TestBody<PostAccountRequestBody>,
            app: &actix_test::TestServer,
            assert_default: bool,
        ) -> AssertTestResponse<PostAccountResponseBody> {
            let mut req = app.post("/accounts");
            req = attach_token_to_req(req, token);
            req = req.insert_header(ContentType::json());
            let mut res = send_req_with_body(req, body).await;
            let res_parsed: AssertTestResponse<PostAccountResponseBody> =
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
        async fn test_curd_accounts() {
            let srv = setup_connection().await;
            let first_usr_token = bootstrap_token(("123", "123"), &srv).await;
            let second_usr_token = bootstrap_token(("1234", "1234"), &srv).await;

            let first_user_account_1_id = {
                let resp = driver_post_account(
                    Some(&first_usr_token),
                    TestBody::Expected(PostAccountRequestBody {
                        account_name: String::from("account 1"),
                    }),
                    &srv,
                    true,
                )
                .await;
                resp.expected.unwrap().id
            };

            let _first_user_account_2_id = {
                let resp = driver_post_account(
                    Some(&first_usr_token),
                    TestBody::Expected(PostAccountRequestBody {
                        account_name: String::from("account 2"),
                    }),
                    &srv,
                    true,
                )
                .await;
                resp.expected.unwrap().id
            };

            let second_user_account_1_id = {
                let resp = driver_post_account(
                    Some(&second_usr_token),
                    TestBody::Expected(PostAccountRequestBody {
                        account_name: String::from("account 1"),
                    }),
                    &srv,
                    true,
                )
                .await;
                resp.expected.unwrap().id
            };

            // Get all accounts of user 1
            {
                let resp = driver_get_accounts(None, Some(&first_usr_token), &srv, true).await;
                assert_eq!(
                    resp.expected.unwrap().items.len(),
                    2,
                    "Accounts of user 1 should be 2."
                );
            }

            // Get all accounts of user 2
            {
                let resp = driver_get_accounts(None, Some(&second_usr_token), &srv, true).await;
                assert_eq!(
                    resp.expected.unwrap().items.len(),
                    1,
                    "Accounts of user 2 should be 1."
                );
            }

            // Get the first account of user 1
            {
                let resp = driver_get_accounts(
                    Some(&first_user_account_1_id),
                    Some(&first_usr_token),
                    &srv,
                    true,
                )
                .await;
                let actual_items = resp.expected.unwrap().items;
                assert_eq!(
                    actual_items.len(),
                    1,
                    "Get the first account of user 1: length should be 1"
                );
                assert_eq!(
                    actual_items.first().unwrap().account_id,
                    first_user_account_1_id,
                    "Get the first account of user 1: id should match"
                );
            }

            // Get the first account of user 2
            {
                let resp = driver_get_accounts(
                    Some(&second_user_account_1_id),
                    Some(&second_usr_token),
                    &srv,
                    true,
                )
                .await;
                let actual_items = resp.expected.unwrap().items;
                assert_eq!(
                    actual_items.len(),
                    1,
                    "Get the first account of user 2: length should be 1"
                );
                assert_eq!(
                    actual_items.first().unwrap().account_id,
                    second_user_account_1_id,
                    "Get the first account of user 2: id should match"
                );
            }

            // Get all accounts without token
            {
                let resp = driver_get_accounts(None, None, &srv, false).await;
                assert_eq!(
                    resp.status,
                    StatusCode::UNAUTHORIZED,
                    "Get all accounts without token"
                );
            }

            // Get any account without token
            {
                let resp =
                    driver_get_accounts(Some(&first_user_account_1_id), None, &srv, false).await;
                assert_eq!(
                    resp.status,
                    StatusCode::UNAUTHORIZED,
                    "Get any account without token"
                );
            }

            // Get accounts of others
            {
                let resp = driver_get_accounts(
                    Some(&first_user_account_1_id),
                    Some(&second_usr_token),
                    &srv,
                    false,
                )
                .await;
                assert_eq!(
                    resp.expected.unwrap().items.len(),
                    0,
                    "Get accounts of others: should return 0 item."
                );
            }
        }
    }
}
