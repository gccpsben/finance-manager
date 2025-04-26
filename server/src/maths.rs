use crate::RESTFUL_DIGITS;
use crate::services::currencies::CalculateCurrencyRateErrors;
use rust_decimal::Decimal;
use std::str::FromStr;

pub trait ForgivingDecimal {
    fn forgiving_decimal_mul_str(
        &self,
        another: &str,
    ) -> Result<Decimal, CalculateCurrencyRateErrors>;
    #[allow(unused)]
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

/// Format decimals that are being sent out via REST.
pub fn format_decimal_restful(val: Decimal) -> String {
    val.round_dp(RESTFUL_DIGITS).normalize().to_string()
}
