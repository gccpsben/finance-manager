use crate::RESTFUL_DIGITS;
use std::{
    fmt::Display,
    ops::{Add, AddAssign, Div, DivAssign, Mul, MulAssign, Sub, SubAssign},
};

/// A wrapper for ``rust_decimal::Decimal`` to streamline handling of ``Option``.
#[derive(Debug, Clone, PartialEq, Eq, Ord, PartialOrd, Copy)]
pub struct Decimal(pub Option<rust_decimal::Decimal>);

impl Display for Decimal {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.0 {
            Some(val) => write!(f, "{}", val),
            None => write!(f, "Unpresentable decimal"),
        }
    }
}

impl From<rust_decimal::Decimal> for Decimal {
    fn from(value: rust_decimal::Decimal) -> Self {
        Self(Some(value))
    }
}

impl AddAssign for Decimal {
    fn add_assign(&mut self, rhs: Self) {
        *self = self.checked_add(rhs);
    }
}

impl SubAssign for Decimal {
    fn sub_assign(&mut self, rhs: Self) {
        *self = self.checked_sub(rhs);
    }
}

impl MulAssign for Decimal {
    fn mul_assign(&mut self, rhs: Self) {
        *self = self.checked_mul(rhs);
    }
}

impl DivAssign for Decimal {
    fn div_assign(&mut self, rhs: Self) {
        *self = self.checked_div(rhs);
    }
}

impl Sub for Decimal {
    type Output = Decimal;
    fn sub(self, rhs: Self) -> Self::Output {
        self.checked_sub(rhs)
    }
}

impl Mul for Decimal {
    type Output = Decimal;
    fn mul(self, rhs: Self) -> Self::Output {
        self.checked_mul(rhs)
    }
}

impl Add for Decimal {
    type Output = Decimal;
    fn add(self, rhs: Self) -> Self::Output {
        self.checked_add(rhs)
    }
}

impl Div for Decimal {
    type Output = Decimal;
    fn div(self, rhs: Self) -> Self::Output {
        self.checked_div(rhs)
    }
}

impl Decimal {
    pub fn new(decimal: rust_decimal::Decimal) -> Self {
        Self(Some(decimal))
    }

    pub fn checked_sub(&self, target: Decimal) -> Self {
        match (self, target) {
            (Self(None), _) | (_, Self(None)) => Self(None),
            (Self(Some(left)), Self(Some(right))) => {
                let add_result = left.checked_sub(right);
                Self(add_result)
            }
        }
    }
    pub fn checked_add(&self, target: Decimal) -> Self {
        match (self, target) {
            (Self(None), _) | (_, Self(None)) => Self(None),
            (Self(Some(left)), Self(Some(right))) => {
                let add_result = left.checked_add(right);
                Self(add_result)
            }
        }
    }
    pub fn checked_mul(&self, target: Decimal) -> Self {
        match (self, target) {
            (Self(None), _) | (_, Self(None)) => Self(None),
            (Self(Some(left)), Self(Some(right))) => {
                let add_result = left.checked_mul(right);
                Self(add_result)
            }
        }
    }
    pub fn checked_div(&self, target: Decimal) -> Self {
        match (self, target) {
            (Self(None), _) | (_, Self(None)) => Self(None),
            (Self(Some(left)), Self(Some(right))) => {
                let add_result = left.checked_div(right);
                Self(add_result)
            }
        }
    }
}

/// Format decimals that are being sent out via REST.
pub fn format_decimal_restful(val: Decimal) -> String {
    match val.0 {
        Some(val) => val.round_dp(RESTFUL_DIGITS).normalize().to_string(),
        None => "Unpresentable".to_string(),
    }
}
