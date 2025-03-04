use crate::routes;
use actix_web::{
    body::MessageBody,
    dev::{ServiceFactory, ServiceRequest, ServiceResponse},
    App, Error,
};

pub fn apply_endpoints(
    app: App<
        impl ServiceFactory<
            ServiceRequest,
            Response = ServiceResponse<impl MessageBody>,
            Config = (),
            InitError = (),
            Error = Error,
        >,
    >,
) -> App<
    impl ServiceFactory<
        ServiceRequest,
        Response = ServiceResponse<impl MessageBody>,
        Config = (),
        InitError = (),
        Error = Error,
    >,
> {
    let mut app = app
        .service(routes::users::login::handler)
        .service(routes::users::register::handler)
        .service(routes::containers::post_container::handler)
        .service(routes::currencies::post_currency::handler)
        .service(routes::currencies::get_currency::handler)
        .service(routes::currency_rate_datums::post_currency_rate_datum::handler)
        .service(routes::txn_tags::get_tags::handler)
        .service(routes::txn_tags::create_tag::handler)
        .service(routes::containers::get_container::handler);

    #[cfg(debug_assertions)]
    {
        app = app.service(routes::dev::dev_test::handler);
    }

    app
}
