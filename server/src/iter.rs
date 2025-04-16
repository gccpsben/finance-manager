pub fn get_first_duplicated<T: PartialEq + Clone>(vec: &[T]) -> Option<T> {
    let mut unique = vec![];
    for item in vec {
        if unique.contains(item) {
            return Some(item.clone());
        }
        unique.push(item.clone());
    }
    None
}
