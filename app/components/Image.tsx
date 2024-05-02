import { IMAGE_PREFIX } from "@/config"

export type ImageProps = {
  w: number
  h: number
  b2key: string
}

export default function Image({ w, h, b2key }: ImageProps) {
  return (
    <img
      src={`${IMAGE_PREFIX}/${b2key}`}
      width={w}
      height={h}
      alt=""
    />
  )
}
