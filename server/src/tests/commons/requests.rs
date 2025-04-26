use actix_http::StatusCode;
use actix_test::ClientRequest;
use actix_test::ClientResponse;
use serde::Serialize;
use serde::de;
use std::str::from_utf8;

pub enum TestBody<T> {
    Bytes(Box<[u8]>),
    Expected(T),
}

#[derive(Clone, Debug)]
pub struct AssertTestResponse<ExpectedType> {
    pub expected: Option<ExpectedType>,
    #[allow(unused)]
    pub json: Option<std::collections::HashMap<String, serde_json::Value>>,
    #[allow(unused)]
    pub str: Option<String>,
    pub status: StatusCode,
}

pub fn attach_token_to_req(req: ClientRequest, token: Option<&str>) -> ClientRequest {
    match token {
        None => req,
        Some(token) => req.insert_header(("authorization", token)),
    }
}

pub async fn send_req_with_body<T: Serialize>(
    req: actix_test::ClientRequest,
    body: TestBody<T>,
) -> ClientResponse {
    match body {
        TestBody::Bytes(seral) => req.send_body(seral.into_vec()),
        TestBody::Expected(expected_body) => req.send_json(&expected_body),
    }
    .await
    .unwrap()
}

pub async fn parse_response_body<ExpectedType: de::DeserializeOwned>(
    res: &mut ClientResponse,
) -> AssertTestResponse<ExpectedType> {
    let status_code = res.status();
    let body_json_str = response_body_to_str(res).await;
    let parsed_body_expected: Option<ExpectedType> = match body_json_str {
        Some(_) => match body_json_str {
            Some(ref body_json_str) => match serde_json::from_str::<ExpectedType>(body_json_str) {
                Ok(expected) => Some(expected),
                Err(_) => None,
            },
            None => None,
        },
        None => None,
    };
    let body_json: Option<std::collections::HashMap<String, serde_json::Value>> =
        match body_json_str {
            Some(ref body_str) => serde_json::from_str(body_str).unwrap_or_default(),
            None => None,
        };
    AssertTestResponse {
        status: status_code,
        expected: parsed_body_expected,
        json: body_json,
        str: Some(String::new()),
    }
}

pub async fn response_body_to_str(res: &mut ClientResponse) -> Option<String> {
    let res_body = res.body().await;
    match res_body {
        Err(_) => None,
        Ok(body_bytes) => match from_utf8(&body_bytes) {
            Err(_) => None,
            Ok(str) => Some(str.to_string()),
        },
    }
}
