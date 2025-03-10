use crate::linear_interpolator::{self, try_linear_interpolate};
use rust_decimal::Decimal;

#[cfg(test)]
pub fn make_xys(x: &str, y: &str) -> Option<(Decimal, Decimal)> {
    Some(
        (
            Decimal::from_str_exact(x).unwrap(),
            Decimal::from_str_exact(y).unwrap()
        )
    )
}

#[cfg(test)]
#[actix_web::test]
pub async fn try_linear_interpolate_normal_1() {
    let left_xy: Option<(Decimal, Decimal)> = make_xys("1", "10");
    let right_xy: Option<(Decimal, Decimal)> = make_xys("2", "20");
    let target = Decimal::from_str_exact("1.5").unwrap();
    let result = try_linear_interpolate(left_xy, right_xy, target);
    assert_eq!(result.unwrap().to_string(), "15.0")
}

#[cfg(test)]
#[actix_web::test]
pub async fn try_linear_interpolate_normal_2() {
    let left_xy: Option<(Decimal, Decimal)> = make_xys("1", "10");
    let right_xy: Option<(Decimal, Decimal)> = make_xys("2", "100");
    let target = Decimal::from_str_exact("1.5").unwrap();
    let result = try_linear_interpolate(left_xy, right_xy, target);
    assert_eq!(result.unwrap().to_string(), "55.0")
}

#[cfg(test)]
#[actix_web::test]
pub async fn try_linear_interpolate_left_overflow() {
    let left_xy: Option<(Decimal, Decimal)> = make_xys("1", "10");
    let right_xy: Option<(Decimal, Decimal)> = make_xys("2", "20");
    let target = Decimal::from_str_exact("0").unwrap();
    let result = try_linear_interpolate(left_xy, right_xy, target);
    assert_eq!(result, None)
}

#[cfg(test)]
#[actix_web::test]
pub async fn try_linear_interpolate_left_overflow_exact() {
    let left_xy: Option<(Decimal, Decimal)> = make_xys("1", "10");
    let right_xy: Option<(Decimal, Decimal)> = make_xys("2", "20");
    let target = Decimal::from_str_exact("1").unwrap();
    let result = try_linear_interpolate(left_xy, right_xy, target);
    assert_eq!(result.unwrap().to_string(), "10")
}

#[cfg(test)]
#[actix_web::test]
pub async fn try_linear_interpolate_right_overflow() {
    let left_xy: Option<(Decimal, Decimal)> = make_xys("1.1", "10.1");
    let right_xy: Option<(Decimal, Decimal)> = make_xys("2.1", "20.1");
    let target = Decimal::from_str_exact("2.2").unwrap();
    let result = try_linear_interpolate(left_xy, right_xy, target);
    assert_eq!(result.unwrap().to_string(), "20.1")
}

#[cfg(test)]
#[actix_web::test]
pub async fn try_linear_interpolate_right_overflow_exact() {
    let left_xy: Option<(Decimal, Decimal)> = make_xys("1.1", "10.1");
    let right_xy: Option<(Decimal, Decimal)> = make_xys("2.1", "20.1");
    let target = Decimal::from_str_exact("2.1").unwrap();
    let result = try_linear_interpolate(left_xy, right_xy, target);
    assert_eq!(result.unwrap().to_string(), "20.1")
}

#[cfg(test)]
#[actix_web::test]
pub async fn try_linear_interpolate_exact() {
    let left_xy: Option<(Decimal, Decimal)> = make_xys("1.1", "10.1");
    let right_xy: Option<(Decimal, Decimal)> = make_xys("1.1", "20.1");
    let target = Decimal::from_str_exact("1.1").unwrap();
    let result = try_linear_interpolate(left_xy, right_xy, target);
    assert_eq!(result.unwrap().to_string(), "20.1")
}