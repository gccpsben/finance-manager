use chrono::TimeDelta;
use rust_decimal::{prelude::FromPrimitive, Decimal};

/// Convert a given `TimeDelta` into its total mills.
/// Panics if `NaiveDateTime`'s mills exceed max.
pub fn force_time_delta_to_mills_decimal(delta: &TimeDelta) -> Decimal {
    Decimal::from_i64(delta.num_milliseconds()).expect("Unable to convert full_range to Decimal.")
}

/// Linear interpolate given `left` and `right`, and a target `x`.
/// This function is left-biased, that means if right is None, value of left will be used.
/// If 2 of the given points have the same `x` value, the right one will be used.
pub fn try_linear_interpolate(
    left_xy: Option<(Decimal, Decimal)>,
    right_xy: Option<(Decimal, Decimal)>,
    target_x: Decimal,
) -> Option<Decimal> {
    match (left_xy, right_xy) {
        (Some((_, left_y)), None) => Some(left_y),
        (Some((left_x, left_y)), Some((right_x, right_y))) => {
            if left_x == right_x && target_x == left_x {
                return Some(right_y);
            }
            if target_x >= left_x && target_x >= right_x {
                return Some(right_y);
            }
            if target_x < left_x {
                return None;
            }
            let slope = (right_y - left_y) / (right_x - left_x);
            let interpolated_y = left_y + slope * (target_x - left_x);
            Some(interpolated_y)
        }
        (_, _) => None,
    }
}
