export function worldMapCopy(locale: string) {
  const bg = locale === 'bg';
  return bg ? {
    map: 'Карта на SOL DORADO',
    openMap: 'Карта',
    backToStreet: 'Обратно на улицата',
    region: 'Регион',
    settlement: 'Населено място',
    zone: 'Зона',
    district: 'Квартал',
    street: 'Улица',
    current: 'Текущо местоположение',
    playable: 'Достъпна улица',
    planned: 'Планирана зона',
    routeLater: 'Маршрутирането до други улици ще бъде добавено в Street v0.3.',
    currentStreet: 'Това е текущата ти улица.',
    parcelOwnable: 'Потенциален имот',
    parcelPublic: 'Публичен / системен обект',
    institution: 'Институция / услуга',
    noStreets: 'Тази част от уличната мрежа още не е детайлно авторирана.',
    mapLoadError: 'Картата не можа да се зареди. Провери дали migration 006 е изпълнена.',
    hierarchyHint: 'Избери област от картата, за да слезеш едно ниво надолу.'
  } : {
    map: 'SOL DORADO Map',
    openMap: 'Map',
    backToStreet: 'Back to street',
    region: 'Region',
    settlement: 'Settlement',
    zone: 'Zone',
    district: 'District',
    street: 'Street',
    current: 'Current location',
    playable: 'Playable street',
    planned: 'Planned area',
    routeLater: 'Routing to other streets will be added in Street v0.3.',
    currentStreet: 'This is your current street.',
    parcelOwnable: 'Potential property',
    parcelPublic: 'Public / system site',
    institution: 'Institution / service',
    noStreets: 'This part of the street network has not been authored in detail yet.',
    mapLoadError: 'The world map could not load. Check that migration 006 has been applied.',
    hierarchyHint: 'Select an area on the map to drill down one level.'
  };
}
