use crate::entities::user;
use sea_orm::{ActiveValue, DatabaseConnection, DbErr, EntityTrait};

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
