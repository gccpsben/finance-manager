use std::str::FromStr;

use crate::services::currencies::CalculateCurrencyRateErrors;
use rust_decimal::Decimal;

#[allow(unused)]
pub trait ForgivingDecimal {
    fn forgiving_decimal_mul_str(
        &self,
        another: &str,
    ) -> Result<Decimal, CalculateCurrencyRateErrors>;
    fn forgiving_decimal_mul(
        &self,
        another: &Decimal,
    ) -> Result<Decimal, CalculateCurrencyRateErrors>;
}

impl ForgivingDecimal for Decimal {
    fn forgiving_decimal_mul_str(
        &self,
        another: &str,
    ) -> Result<Decimal, CalculateCurrencyRateErrors> {
        self.checked_mul(Decimal::from_str(another).map_err(|_err| {
            CalculateCurrencyRateErrors::InvalidDecimalValue(another.to_string())
        })?)
        .ok_or(CalculateCurrencyRateErrors::OverflowOrUnderflow)
    }
    fn forgiving_decimal_mul(
        &self,
        another: &Decimal,
    ) -> Result<Decimal, CalculateCurrencyRateErrors> {
        self.checked_mul(*another)
            .ok_or(CalculateCurrencyRateErrors::OverflowOrUnderflow)
    }
}
