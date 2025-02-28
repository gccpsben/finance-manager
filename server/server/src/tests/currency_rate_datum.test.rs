#[cfg(test)]
pub mod currencies {

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

        use crate::routes::currency_rate_datums::post_currency_rate_datum::{
            PostCurrencyRateDatumRequestBody, PostCurrencyRateDatumResponseBody,
        };

        use super::*;
        pub async fn driver_post_currency_rate_datum<
            B: MessageBody,
            E: std::fmt::Debug,
            const ASSERT_DEFAULT: bool,
        >(
            body: TestBody<PostCurrencyRateDatumRequestBody>,
            token: Option<&str>,
            app: &impl Service<Request, Response = ServiceResponse<B>, Error = E>,
        ) -> AssertTestResponse<PostCurrencyRateDatumResponseBody> {
            let mut req = test::TestRequest::default();
            req = req.insert_header(ContentType::json());
            req = attach_token_to_req(req, token);
            req = match body {
                TestBody::Serialize(seral) => req.set_json(seral),
                TestBody::Expected(expected_body) => req.set_json(expected_body),
            };
            req = req.uri("/currency_rate_datums");
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
        use uuid::Uuid;

        use super::{drivers::driver_post_currency_rate_datum, *};
        use crate::{routes::{
            currencies::post_currency::PostCurrencyRequestBody, currency_rate_datums::post_currency_rate_datum::PostCurrencyRateDatumRequestBody, users::register::PostUserRequestBody
        }, tests::currency_tests::currencies::drivers::driver_post_currency};

        #[actix_web::test]
        async fn test_curd_currency_rate_datums() {

            let app = setup_connection().await;
            let user_1_creds = PostUserRequestBody {
                password: String::from("123"),
                username: String::from("123"),
            };

            // Post user
            let _user_1_id = {
                driver_post_user::<_, _, true>(TestBody::Expected(user_1_creds.clone()), &app)
                    .await
                    .expected
                    .unwrap()
                    .id
            };

            // Login
            let user_1_token = {
                driver_login_user::<_, _, true>(
                    TestBody::Expected((&user_1_creds.username, &user_1_creds.password)),
                    &app,
                )
                .await
                .expected
                .unwrap()
                .token
            };

            // Create valid base currency
            let base_currency_id = driver_post_currency::<_,_,true>(
                TestBody::Expected(PostCurrencyRequestBody {
                    fallback_rate_amount: None,
                    fallback_rate_currency_id: None,
                    name: String::from("Base Currency"),
                    ticker: String::from("BASE")
                }),
                Some(&user_1_token),
                &app
            ).await.expected.unwrap().id;

            // Create valid secondary currency
            let second_currency_id = driver_post_currency::<_,_,true>(
                TestBody::Expected(PostCurrencyRequestBody {
                    fallback_rate_amount: Some("10".to_string()),
                    fallback_rate_currency_id: Some(base_currency_id.clone()),
                    name: String::from("Base Currency"),
                    ticker: String::from("BASE")
                }),
                Some(&user_1_token),
                &app
            ).await.expected.unwrap().id;

            // Create valid datum
            {
                driver_post_currency_rate_datum::<_, _, true>(
                    TestBody::Expected(PostCurrencyRateDatumRequestBody {
                        ref_currency_id: second_currency_id.clone(),
                        ref_amount_currency_id: base_currency_id.clone(),
                        amount: "10".to_string(),
                        date: 1,
                    }),
                    Some(&user_1_token),
                    &app,
                )
                .await;
            }

            // Disallow multiple datums on the same time
            {
                let resp = driver_post_currency_rate_datum::<_, _, false>(
                    TestBody::Expected(PostCurrencyRateDatumRequestBody {
                        ref_currency_id: second_currency_id.clone(),
                        ref_amount_currency_id: base_currency_id.clone(),
                        amount: "10".to_string(),
                        date: 1,
                    }),
                    Some(&user_1_token),
                    &app,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }

            // Disallow cyclic datums
            {
                let resp = driver_post_currency_rate_datum::<_, _, false>(
                    TestBody::Expected(PostCurrencyRateDatumRequestBody {
                        ref_currency_id: second_currency_id.clone(),
                        ref_amount_currency_id: second_currency_id.clone(),
                        amount: "10".to_string(),
                        date: 2,
                    }),
                    Some(&user_1_token),
                    &app,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }

            // Disallow unknown currencies
            {
                let resp = driver_post_currency_rate_datum::<_, _, false>(
                    TestBody::Expected(PostCurrencyRateDatumRequestBody {
                        ref_currency_id: Uuid::new_v4().to_string(),
                        ref_amount_currency_id: base_currency_id.clone(),
                        amount: "10".to_string(),
                        date: 2,
                    }),
                    Some(&user_1_token),
                    &app,
                )
                .await;
                assert_eq!(resp.status, StatusCode::BAD_REQUEST);
            }
        }
    }
}
