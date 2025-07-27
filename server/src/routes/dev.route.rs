#![allow(warnings, unused)]
#[cfg(debug_assertions)]
#[cfg_attr(test, mutants::skip)]
pub mod dev_test {
    use crate::DatabaseStates;
    use actix_web::{HttpResponse, get, web};

    #[get("/dev-test")]
    async fn handler(data: web::Data<DatabaseStates>) -> HttpResponse {
        HttpResponse::Ok().body(format!("ok"))
    }
}
