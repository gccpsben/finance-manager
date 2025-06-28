use actix_http::StatusCode;
use actix_test::ClientRequest;
use actix_test::ClientResponse;
use serde::Serialize;
use serde::de;
use std::fmt::Display;
use std::str::from_utf8;

pub enum TestBody<T> {
    Bytes(Box<[u8]>),
    Expected(T),
}

pub enum TestQuery<T> {
    Str(Box<[(String, String)]>),
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

/// Attach a header to request if the value is `Some(T)`.
pub fn req_attach_header_if<T: Display>(
    req: ClientRequest,
    key: &str,
    value: Option<T>,
) -> ClientRequest {
    match value {
        Some(v) => req.insert_header((key, v.to_string())),
        None => req,
    }
}

pub fn attach_token_to_req(req: ClientRequest, token: Option<&str>) -> ClientRequest {
    req_attach_header_if(req, "authorization", token)
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
    let parsed_body_expected: Option<ExpectedType> = body_json_str
        .clone()
        .and_then(|body_json_str| serde_json::from_str::<ExpectedType>(&body_json_str).ok());
    let body_json: Option<std::collections::HashMap<String, serde_json::Value>> = body_json_str
        .clone()
        .map(|body| serde_json::from_str(&body).unwrap_or_default());
    AssertTestResponse {
        status: status_code,
        expected: parsed_body_expected,
        json: body_json,
        str: body_json_str,
    }
}

pub async fn response_body_to_str(res: &mut ClientResponse) -> Option<String> {
    res.body()
        .await
        .ok()
        .and_then(|body_bytes| from_utf8(&body_bytes).ok().map(|bytes| bytes.to_string()))
}
