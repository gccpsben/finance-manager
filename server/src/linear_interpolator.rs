use rust_decimal::Decimal;

/// Linear interpolate given `left` and `right`, and a target `x``.
/// This function is left-biased, that means if right is None, value of left will be used.
/// If 2 of the given points have the same `x` value, the right one will be used.
pub fn try_linear_interpolate(
    left_xy: Option<(Decimal, Decimal)>,
    right_xy: Option<(Decimal, Decimal)>,
    target_x: Decimal
) -> Option<Decimal> {
    match (left_xy, right_xy) {
        (Some((left_x, left_y)), None) => Some(left_y),
        (Some((left_x, left_y)), Some((right_x, right_y))) => {
            if left_x == right_x && target_x == left_x {
                return Some(right_y)
            }
            if target_x >= left_x && target_x >= right_x {
                return Some(right_y)
            }
            if target_x < left_x {
                return None
            }
            let slope = (right_y - left_y) / (right_x - left_x);
            let interpolated_y = left_y + slope * (target_x - left_x);
            Some(interpolated_y)
        },
        (_, _) => None,
    }
}