use crate::entities::container;
use crate::extractors::auth_user::AuthUser;
use crate::services::TransactionWithCallback;
use sea_orm::prelude::DateTime;
use sea_orm::{ActiveValue, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, QueryFilter};

pub async fn create_container<'a>(
    auth_user: &AuthUser,
    name: &str,
    creation_date: DateTime,
    db_txn: TransactionWithCallback<'a>,
) -> Result<(uuid::Uuid, TransactionWithCallback<'a>), DbErr> {
    let new_container = container::ActiveModel {
        id: ActiveValue::Set(uuid::Uuid::new_v4()),
        name: ActiveValue::Set(name.to_string()),
        owner_id: ActiveValue::Set(auth_user.0),
        creation_date: ActiveValue::Set(creation_date),
    };
    let model = container::Entity::insert(new_container)
        .exec(db_txn.get_db_txn())
        .await?;
    Ok((model.last_insert_id, db_txn))
}

pub async fn get_container(
    user: &AuthUser,
    id: uuid::Uuid,
    db: &DatabaseConnection,
) -> Result<Option<container::Model>, DbErr> {
    container::Entity::find()
        .filter(container::Column::OwnerId.eq(user.0))
        .filter(container::Column::Id.eq(id))
        .one(db)
        .await
}

pub async fn get_containers(
    user: &AuthUser,
    db: &DatabaseConnection,
) -> Result<Vec<container::Model>, DbErr> {
    container::Entity::find()
        .filter(container::Column::OwnerId.eq(user.0))
        .all(db)
        .await
}
