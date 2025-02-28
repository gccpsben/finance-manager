use crate::repositories::TransactionWithCallback;
use crate::{entities::container, extractors::auth_user::AuthUser};
use sea_orm::prelude::DateTime;
use sea_orm::{ActiveValue, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter};

pub async fn create_container<'a>(
    owner_id: uuid::Uuid,
    name: &str,
    creation_date: DateTime,
    db_txn: TransactionWithCallback<'a>,
) -> Result<(uuid::Uuid, TransactionWithCallback<'a>), DbErr> {
    let new_container = container::ActiveModel {
        id: ActiveValue::Set(uuid::Uuid::new_v4()),
        name: ActiveValue::Set(name.to_string()),
        owner_id: ActiveValue::Set(owner_id),
        creation_date: ActiveValue::Set(creation_date),
    };
    let insert_result = container::Entity::insert(new_container)
        .exec(db_txn.get_db_txn())
        .await;
    match insert_result {
        Ok(model) => Ok((model.last_insert_id, db_txn)),
        Err(db_err) => Err(db_err),
    }
}

pub async fn get_container(
    user: &AuthUser,
    id: uuid::Uuid,
    db: &DatabaseConnection,
) -> Result<Option<container::Model>, DbErr> {
    container::Entity::find()
        .filter(container::Column::OwnerId.eq(user.user_id))
        .filter(container::Column::Id.eq(id))
        .one(db)
        .await
}

pub async fn get_containers(
    user: &AuthUser,
    db: &DatabaseConnection,
) -> Result<Vec<container::Model>, DbErr> {
    container::Entity::find()
        .filter(container::Column::OwnerId.eq(user.user_id))
        .all(db)
        .await
}
