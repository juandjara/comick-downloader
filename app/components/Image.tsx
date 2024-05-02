export default function Image({ w, h, b2key }: { w: number; h: number; b2key: string }) {
  return (
    <img
      src={`https://s3.comick.ink/comick/${b2key}`}
      width={w}
      height={h}
      alt=""
    />
  )
}
