export default function SliderField({ label, value, min = 0, max = 1, step = 0.05, onChange }) {
  return (
    <label className="slider-field">
      <span>
        {label}
        <b>
          {value[0]} - {value[1]}
        </b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value[0]} onChange={(event) => onChange([Number(event.target.value), value[1]])} />
      <input type="range" min={min} max={max} step={step} value={value[1]} onChange={(event) => onChange([value[0], Number(event.target.value)])} />
    </label>
  );
}
