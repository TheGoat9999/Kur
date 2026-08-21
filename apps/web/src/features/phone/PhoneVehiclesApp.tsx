import { useEffect, useState } from 'react';
import type { VehicleState } from '@sol-dorado/contracts/vehicles';
import { GameIcon } from '../../components/GameIcon';
import { getVehicles } from '../../lib/api';
import './phone-vehicles.css';

type Locale = 'bg' | 'en';

export function PhoneVehiclesApp({ locale, onLocateVehicle }: { locale: Locale; onLocateVehicle: (vehicleId: string) => void }) {
  const [vehicles, setVehicles] = useState<VehicleState | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getVehicles()
      .then(state => { if (active) setVehicles(state); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  if (error) {
    return <div className="phone-vehicle-state"><GameIcon name="car" size={28} /><b>{L(locale, 'Колите не са достъпни', 'Vehicles unavailable')}</b><span>{L(locale, 'Опитай отново след малко.', 'Try again in a moment.')}</span></div>;
  }
  if (!vehicles) {
    return <div className="phone-vehicle-state"><span className="phone-vehicle-loading" /><b>{L(locale, 'Проверка на паркираните коли...', 'Checking parked vehicles...')}</b></div>;
  }
  if (!vehicles.ownedVehicles.length) {
    return <div className="phone-vehicle-state"><GameIcon name="car" size={28} /><b>{L(locale, 'Нямаш автомобил', 'No vehicle yet')}</b><span>{L(locale, 'Автомобили се купуват физически от автокъщите в града.', 'Vehicles are purchased physically from dealerships in the city.')}</span></div>;
  }

  return <section className="phone-vehicles-app">
    <header>
      <div><small>{L(locale, 'МОИТЕ КОЛИ', 'MY VEHICLES')}</small><h2>{L(locale, 'Паркирани в града', 'Parked in the city')}</h2></div>
      <b>{vehicles.ownedVehicles.length}</b>
    </header>
    <p className="phone-vehicles-intro">{L(locale,
      'Тук виждаш коя кола притежаваш и къде е оставена. Управлението на колата става до самия автомобил в света.',
      'See what you own and where it is parked. Vehicle controls stay beside the actual car in the world.'
    )}</p>
    <div className="phone-vehicle-list">
      {vehicles.ownedVehicles.map(vehicle => {
        const status = vehicle.occupied
          ? L(locale, 'В момента си в нея', 'You are in this vehicle')
          : vehicle.withinInteractionRange
            ? L(locale, 'Колата е до теб', 'The car is beside you')
            : vehicle.atPlayerLocation
              ? L(locale, 'На тази улица', 'On this street')
              : L(locale, 'Паркирана', 'Parked');
        return <article key={vehicle.id} className={`${vehicle.active ? 'active' : ''} ${vehicle.withinInteractionRange ? 'near' : ''}`}>
          <div className="phone-vehicle-row-main">
            <span className="phone-vehicle-symbol"><GameIcon name="car" size={21} /></span>
            <div>
              <span>{vehicle.active ? L(locale, 'АКТИВНА', 'ACTIVE') : status.toUpperCase()}</span>
              <b>{vehicle.model.brand} {vehicle.model.model}</b>
              <small>{vehicle.model.year} · {vehicle.locked ? L(locale, 'Заключена', 'Locked') : L(locale, 'Отключена', 'Unlocked')}</small>
            </div>
          </div>
          <div className="phone-vehicle-address">
            <GameIcon name="map-pin" size={14} />
            <div><b>{vehicle.parkedLocation.street}</b><small>{vehicle.parkedLocation.segment} · {vehicle.parkedLocation.district}</small></div>
          </div>
          <button type="button" onClick={() => onLocateVehicle(vehicle.id)}>
            <GameIcon name="map-pin" size={14} />
            {vehicle.atPlayerLocation
              ? L(locale, 'Покажи колата в света', 'Show car in world')
              : L(locale, 'Покажи местоположението', 'Show location')}
          </button>
        </article>;
      })}
    </div>
    <footer>{L(locale, 'Техническо състояние и диагностика не се показват тук. За това има сервизи и оглед при покупка.', 'Mechanical condition and diagnostics are not exposed here. Use inspections and service shops for that.')}</footer>
  </section>;
}

function L(locale: Locale, bg: string, en: string) { return locale === 'bg' ? bg : en; }
