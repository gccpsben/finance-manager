use argon2::password_hash::Error;
use argon2::PasswordHasher;
use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHash, PasswordVerifier,
};
use sea_orm::{ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter};

use crate::entities::{access_token, user};
use crate::routes::bootstrap::EndpointsErrors;

use sea_orm::ActiveValue;

pub async fn create_user(
    username: &str,
    password_hash: &str,
    db: &DatabaseConnection,
) -> Result<uuid::Uuid, DbErr> {
    let new_user = user::ActiveModel {
        id: ActiveValue::Set(uuid::Uuid::new_v4()),
        name: ActiveValue::Set(username.to_string()),
        password_hash: ActiveValue::Set(password_hash.to_string()),
    };
    let insert_result = user::Entity::insert(new_user).exec(db).await;
    match insert_result {
        Ok(model) => Ok(model.last_insert_id),
        Err(db_err) => Err(db_err),
    }
}

pub async fn generate_token_unverified(
    user_id: uuid::Uuid,
    db: &DatabaseConnection,
) -> Result<sea_orm::InsertResult<access_token::ActiveModel>, DbErr> {
    let new_token = access_token::ActiveModel {
        user_id: sea_orm::ActiveValue::Set(user_id),
        id: sea_orm::ActiveValue::Set(uuid::Uuid::new_v4()),
    };
    access_token::Entity::insert(new_token).exec(db).await
}

#[derive(Debug)]
pub enum VerifyCredsErr {
    DbErr(DbErr),
    InvalidHash,
    InvalidCreds,
}

impl From<VerifyCredsErr> for EndpointsErrors {
    fn from(value: VerifyCredsErr) -> Self {
        match value {
            VerifyCredsErr::DbErr(err) => Self::DbErr(err),
            VerifyCredsErr::InvalidCreds => Self::Unauthorized,
            VerifyCredsErr::InvalidHash => Self::Unauthorized,
        }
    }
}

pub async fn verify_creds(
    username: &str,
    password: &str,
    db: &DatabaseConnection,
) -> Result<user::Model, VerifyCredsErr> {
    let existing_queried_user = user::Entity::find()
        .filter(user::Column::Name.eq(username))
        .one(db)
        .await
        .map_err(VerifyCredsErr::DbErr)?
        .ok_or(VerifyCredsErr::InvalidCreds)?;

    let expected_hash = PasswordHash::parse(
        existing_queried_user.password_hash.as_str(),
        argon2::password_hash::Encoding::B64,
    )
    .map_err(|_| VerifyCredsErr::InvalidHash)?;

    Argon2::default()
        .verify_password(password.as_bytes(), &expected_hash)
        .map_err(|_| VerifyCredsErr::InvalidCreds)?;

    Ok(existing_queried_user)
}

#[derive(Debug)]
pub enum RegisterUserErrors {
    HashError(Error),
    DbErr(DbErr),
    EmptyUsername,
    EmptyPassword,
}

impl From<RegisterUserErrors> for EndpointsErrors {
    fn from(value: RegisterUserErrors) -> Self {
        match value {
            RegisterUserErrors::HashError(_err) => Self::InternalServerError {
                msg: "Hash error.".to_string(),
            },
            RegisterUserErrors::DbErr(db_err) => Self::DbErr(db_err),
            RegisterUserErrors::EmptyUsername => Self::MissingUsername,
            RegisterUserErrors::EmptyPassword => Self::MissingPassword,
        }
    }
}

pub async fn register_user(
    username: &str,
    password_raw: &str,
    db: &DatabaseConnection,
) -> Result<uuid::Uuid, RegisterUserErrors> {
    if username.trim().is_empty() {
        return Err(RegisterUserErrors::EmptyUsername);
    }

    if password_raw.is_empty() {
        return Err(RegisterUserErrors::EmptyPassword);
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let pw_hash = argon2.hash_password(password_raw.as_bytes(), &salt);
    let pw_hash = match pw_hash {
        Err(err) => return Err(RegisterUserErrors::HashError(err)),
        Ok(hash) => hash,
    };

    create_user(username, pw_hash.to_string().as_str(), db)
        .await
        .map_err(RegisterUserErrors::DbErr)
}
