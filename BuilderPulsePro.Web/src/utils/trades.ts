export const tradeOptions = [
  'Cabinetry',
  'Carpentry',
  'Concrete',
  'Doors',
  'Drywall',
  'Electrical',
  'Excavating',
  'Flooring',
  'Foundation',
  'Framing',
  'General Contracting',
  'Glass',
  'HVAC',
  'Landscaping',
  'Masonry',
  'Painting',
  'Plumbing',
  'Remodeling',
  'Roofing',
  'Siding',
  'Tiling',
  'Windows',
]

export const normalizeTrades = (values: string[]) => {
  const lookup = new Map(tradeOptions.map((trade) => [trade.toLowerCase(), trade]))
  return values
    .map((trade) => lookup.get(trade.trim().toLowerCase()))
    .filter((trade): trade is string => Boolean(trade))
}
