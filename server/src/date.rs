use chrono::{DateTime, NaiveDateTime, Utc};
use serde::de::Error;
use serde::Deserialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ParseISO8601Errors {
    #[error("Unable to parse the given date.")]
    ParseError(chrono::ParseError),
    #[error("The given date is missing the UTC time zone.")]
    MissingUTCZ,
}

#[allow(unused)]
pub fn serde_str_to_iso8601<'de, D>(
    deserializer: D,
) -> Result<chrono::DateTime<chrono::Utc>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: &str = Deserialize::deserialize(deserializer)?;
    let mut owned = String::from(s);
    if owned.len() > 1 {
        match owned.pop() {
            Some('Z') => {}
            _ => {
                return Err(D::Error::custom(
                    "The last char of the given date must be 'Z'.",
                ))
            }
        }
    }
    Ok(
        DateTime::parse_from_str(owned.as_str(), "%Y-%m-%dT%H:%M:%S%.3f")
            .map_err(D::Error::custom)?
            .to_utc(),
    )
}

pub fn utc_str_to_iso8601(
    input: &str,
) -> Result<chrono::DateTime<chrono::Utc>, ParseISO8601Errors> {
    let mut owned = String::from(input);
    if owned.len() > 1 {
        match owned.pop() {
            Some('Z') => {}
            _ => return Err(ParseISO8601Errors::MissingUTCZ),
        }
    }
    let fixed_offset_date = NaiveDateTime::parse_from_str(owned.as_str(), "%Y-%m-%dT%H:%M:%S%.3f")
        .map_err(ParseISO8601Errors::ParseError)?;
    Ok(chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(
        fixed_offset_date,
        Utc,
    ))
}
