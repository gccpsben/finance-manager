#[cfg(test)]
use crate::services::currency_rate_datum::find_neighbors_left_biased;

#[actix_web::test]
#[cfg(test)]
pub async fn try_nearest_neighbors_1() {
    let result = find_neighbors_left_biased(&2, Some((1, "A")), Some((3, "B")));
    assert_eq!(result.0, Some("A"));
    assert_eq!(result.1, Some("B"));
}

#[actix_web::test]
#[cfg(test)]
pub async fn try_nearest_neighbors_2() {
    let result = find_neighbors_left_biased(&1, Some((2, "A")), Some((3, "B")));
    assert_eq!(result.0, None);
    assert_eq!(result.1, None);
}

#[actix_web::test]
#[cfg(test)]
pub async fn try_nearest_neighbors_3() {
    let result = find_neighbors_left_biased(&4, Some((1, "A")), Some((3, "B")));
    assert_eq!(result.0, Some("B"));
    assert_eq!(result.1, None);
}

#[actix_web::test]
#[cfg(test)]
pub async fn try_nearest_neighbors_4() {
    let result = find_neighbors_left_biased(&4, Some((1, "A")), None);
    assert_eq!(result.0, Some("A"));
    assert_eq!(result.1, None);
}

#[actix_web::test]
#[cfg(test)]
pub async fn try_nearest_neighbors_5() {
    let result = find_neighbors_left_biased(&4, None, Some((1, "A")));
    assert_eq!(result.0, Some("A"));
    assert_eq!(result.1, None);
}

#[actix_web::test]
#[cfg(test)]
pub async fn try_nearest_neighbors_6() {
    let result = find_neighbors_left_biased(&4, None, Some((1, "A")));
    assert_eq!(result.0, Some("A"));
    assert_eq!(result.1, None);
}

#[actix_web::test]
#[cfg(test)]
pub async fn try_nearest_neighbors_7() {
    let result = find_neighbors_left_biased(&4, Some((1, "A")), None);
    assert_eq!(result.0, Some("A"));
    assert_eq!(result.1, None);
}

#[actix_web::test]
#[cfg(test)]
pub async fn try_nearest_neighbors_8() {
    let result = find_neighbors_left_biased(&1, None, Some((4, "A")));
    assert_eq!(result.0, None);
    assert_eq!(result.1, None);
}

#[actix_web::test]
#[cfg(test)]
pub async fn try_nearest_neighbors_9() {
    let result = find_neighbors_left_biased(&1, Some((4, "A")), None);
    assert_eq!(result.0, None);
    assert_eq!(result.1, None);
}

#[actix_web::test]
#[cfg(test)]
pub async fn try_nearest_neighbors_10() {
    let result = find_neighbors_left_biased(&1, None, Some((4, "A")));
    assert_eq!(result.0, None);
    assert_eq!(result.1, None);
}

#[actix_web::test]
#[cfg(test)]
pub async fn try_nearest_neighbors_11() {
    let result = find_neighbors_left_biased::<i32, i32>(&1, None, None);
    assert_eq!(result.0, None);
    assert_eq!(result.1, None);
}

#[actix_web::test]
#[cfg(test)]
pub async fn try_nearest_neighbors_12() {
    let result = find_neighbors_left_biased::<i32, &str>(&1, Some((4, "A")), Some((0, "B")));
    assert_eq!(result.0, Some("B"));
    assert_eq!(result.1, Some("A"));
}

#[actix_web::test]
#[cfg(test)]
pub async fn try_nearest_neighbors_13() {
    let result = find_neighbors_left_biased::<i32, &str>(&1, Some((0, "A")), Some((4, "B")));
    assert_eq!(result.0, Some("A"));
    assert_eq!(result.1, Some("B"));
}
