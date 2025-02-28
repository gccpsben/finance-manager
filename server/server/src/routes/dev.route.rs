#![allow(warnings, unused)]
#[cfg(debug_assertions)]
#[cfg_attr(test, mutants::skip)]
pub mod dev_test {

    use crate::{entities::currency, DatabaseStates};
    use actix_web::{get, web, HttpResponse};
    use argon2::Argon2;
    use argon2::PasswordHasher;
    use sea_orm::TransactionTrait;
    use sea_orm::{ActiveValue, DatabaseTransaction, EntityTrait};
    use std::{ops::Deref, str::FromStr, sync::Mutex};
    use uuid::Uuid;

    #[get("/dev-test")]
    async fn handler(data: web::Data<DatabaseStates>) -> HttpResponse {
        let salt = argon2::password_hash::SaltString::generate(
            &mut argon2::password_hash::rand_core::OsRng,
        );
        let argon2 = Argon2::default();
        let pw_hash = argon2.hash_password("ajkshdkashd".as_bytes(), &salt);
        HttpResponse::Ok().body(format!("asdasd{}", pw_hash.unwrap().to_string()))
    }
}
