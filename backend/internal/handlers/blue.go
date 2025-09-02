package handlers

import (
	"image"
	"image/color"
	"math"
)

/************  КОНСТАНТЫ ПОД ТВОЙ ГРАДИЕНТ  ************/
const (
	Hue0       = 250.8 // центр тона, градусы
	HueTolCore = 22.0  // жёсткое окно по тону
	HueTolFrng = 28.0  // мягкое окно по тону

	SminCore = 0.35
	SminFrng = 0.20

	VminCore = 0.55
	VminFrng = 0.40
	Vmax     = 0.98

	TargetSize = 494 // фиксированный размер квадрата
	SizeTol    = 3

	TightenPct = 0.70 // доля "фиолетовых" при прижатии внутрь
	InsetFinal = 1    // финальный подрез, px
)

// LAB-центр и инверсия ковариации (округлено)
var labMu = [3]float64{49.06, 28.71, -46.56}
var labInv = [3][3]float64{
	{0.5903, 0.6536, -0.0649},
	{0.6536, 0.8075, -0.1194},
	{-0.0649, -0.1194, 0.0569},
}
const labMd2Max = 9.0 // d^2 <= 9 (~3σ)

/************  HSV + LAB УТИЛИТЫ  ************/

func angDiff(a, b float64) float64 {
	d := math.Abs(a - b)
	if d > 180 {
		d = 360 - d
	}
	return d
}

// rgbToHSV возвращает H∈[0,360), S,V∈[0,1]
func rgbToHSV(c color.Color) (h, s, v float64) {
	r8, g8, b8, _ := c.RGBA()
	r := float64(r8) / 65535.0
	g := float64(g8) / 65535.0
	b := float64(b8) / 65535.0

	max := math.Max(r, math.Max(g, b))
	min := math.Min(r, math.Min(g, b))
	v = max

	delta := max - min
	if max == 0 {
		s = 0
		h = 0
		return
	}
	s = delta / max

	switch {
	case delta == 0:
		h = 0
	case max == r:
		h = 60 * math.Mod(((g-b)/delta), 6)
	case max == g:
		h = 60 * (((b - r) / delta) + 2)
	default:
		h = 60 * (((r - g) / delta) + 4)
	}
	if h < 0 {
		h += 360
	}
	return
}

// rgbToLab: sRGB (assume D65), возвращает CIE L*a*b* (D65)
func rgbToLab(c color.Color) (L, A, B float64) {
	r8, g8, b8, _ := c.RGBA()
	r := float64(r8) / 65535.0
	g := float64(g8) / 65535.0
	b := float64(b8) / 65535.0

	// sRGB -> linear
	r = srgbToLinear(r)
	g = srgbToLinear(g)
	b = srgbToLinear(b)

	// linear RGB -> XYZ (D65)
	X := 0.4124564*r + 0.3575761*g + 0.1804375*b
	Y := 0.2126729*r + 0.7151522*g + 0.0721750*b
	Z := 0.0193339*r + 0.1191920*g + 0.9503041*b

	// нормализуем на белую точку D65
	Xn, Yn, Zn := 0.95047, 1.00000, 1.08883
	xr := X / Xn
	yr := Y / Yn
	zr := Z / Zn

	fx := labF(xr)
	fy := labF(yr)
	fz := labF(zr)

	L = 116*fy - 16
	A = 500 * (fx - fy)
	B = 200 * (fy - fz)
	return
}

func srgbToLinear(u float64) float64 {
	if u <= 0.04045 {
		return u / 12.92
	}
	return math.Pow((u+0.055)/1.055, 2.4)
}

func labF(t float64) float64 {
	const eps = 216.0 / 24389.0 // 0.008856
	const kappa = 24389.0 / 27.0
	if t > eps {
		return math.Cbrt(t)
	}
	return (kappa*t + 16.0) / 116.0
}

/************  МАХАЛАНОБИС ************/

// mahDist2: d^2 = (x-μ)^T Σ⁻¹ (x-μ)
func mahDist2(x [3]float64, mu [3]float64, inv [3][3]float64) float64 {
	dx0 := x[0] - mu[0]
	dx1 := x[1] - mu[1]
	dx2 := x[2] - mu[2]

	// y = inv * dx
	y0 := inv[0][0]*dx0 + inv[0][1]*dx1 + inv[0][2]*dx2
	y1 := inv[1][0]*dx0 + inv[1][1]*dx1 + inv[1][2]*dx2
	y2 := inv[2][0]*dx0 + inv[2][1]*dx1 + inv[2][2]*dx2
	// dx^T * y
	return dx0*y0 + dx1*y1 + dx2*y2
}

/************  СБОРКА МАСКИ ПО HSV+LAB ************/

// PurpleMaskHSVLAB: core || (fringe && LAB-страховка)
func PurpleMaskHSVLAB(img image.Image) *image.Gray {
	b := img.Bounds()
	out := image.NewGray(b)

	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			col := img.At(x, y)

			h, s, v := rgbToHSV(col)
			L, a, bb := rgbToLab(col)
			labD2 := mahDist2([3]float64{L, a, bb}, labMu, labInv)

			inCore := (angDiff(h, Hue0) <= HueTolCore &&
				s >= SminCore &&
				v >= VminCore && v <= Vmax)

			inFringe := (angDiff(h, Hue0) <= HueTolFrng &&
				s >= SminFrng &&
				v >= VminFrng && v <= Vmax)

			ok := inCore || (inFringe && labD2 <= labMd2Max)
			if ok {
				out.SetGray(x, y, color.Gray{Y: 255})
			} else {
				out.SetGray(x, y, color.Gray{Y: 0})
			}
		}
	}
	return out
}

/************  "ПРИЖАТЬ ВНУТРЬ" К МАСКЕ ************/

// TightenToMaskInner двигает каждую сторону прямоугольника ТОЛЬКО внутрь,
// пока доля белых пикселей в соответствующей строке/колонке >= pct.
// Используй порог pct ~ 0.70 (70%).
func TightenToMaskInner(mask image.Image, r image.Rectangle, pct float64) image.Rectangle {
	b := mask.Bounds()
	isIn := func(x, y int) bool {
		if x < b.Min.X || x >= b.Max.X || y < b.Min.Y || y >= b.Max.Y {
			return false
		}
		return color.GrayModel.Convert(mask.At(x, y)).(color.Gray).Y >= 128
	}

	// LEFT → вправо
	for x := r.Min.X; x < r.Max.X; x++ {
		total, inside := 0, 0
		for y := r.Min.Y; y < r.Max.Y; y++ {
			total++
			if isIn(x, y) {
				inside++
			}
		}
		if total > 0 && float64(inside)/float64(total) >= pct {
			r.Min.X = x
			break
		}
	}
	// RIGHT → влево
	for x := r.Max.X - 1; x >= r.Min.X; x-- {
		total, inside := 0, 0
		for y := r.Min.Y; y < r.Max.Y; y++ {
			total++
			if isIn(x, y) {
				inside++
			}
		}
		if total > 0 && float64(inside)/float64(total) >= pct {
			r.Max.X = x + 1
			break
		}
	}
	// TOP → вниз
	for y := r.Min.Y; y < r.Max.Y; y++ {
		total, inside := 0, 0
		for x := r.Min.X; x < r.Max.X; x++ {
			total++
			if isIn(x, y) {
				inside++
			}
		}
		if total > 0 && float64(inside)/float64(total) >= pct {
			r.Min.Y = y
			break
		}
	}
	// BOTTOM → вверх
	for y := r.Max.Y - 1; y >= r.Min.Y; y-- {
		total, inside := 0, 0
		for x := r.Min.X; x < r.Max.X; x++ {
			total++
			if isIn(x, y) {
				inside++
			}
		}
		if total > 0 && float64(inside)/float64(total) >= pct {
			r.Max.Y = y + 1
			break
		}
	}
	return r
}

/************  ПАРА МАЛЕНЬКИХ ХЕЛПЕРОВ  ************/

// SafeInset уменьшает прямоугольник на n пикселей со всех сторон (если есть куда).
func SafeInset(r image.Rectangle, n int) image.Rectangle {
	for i := 0; i < n; i++ {
		if r.Dx() <= 2 || r.Dy() <= 2 {
			break
		}
		r.Min.X++
		r.Min.Y++
		r.Max.X--
		r.Max.Y--
	}
	return r
}

// ====== 1) Морфология: dilate/erode/closing над image.Gray ======

func morphDilateGray(src *image.Gray, r int) *image.Gray {
	if r < 1 {
		return src
	}
	b := src.Bounds()
	dst := image.NewGray(b)
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			v := uint8(0)
			yy0 := maxInt(b.Min.Y, y-r)
			yy1 := minInt(b.Max.Y-1, y+r)
			xx0 := maxInt(b.Min.X, x-r)
			xx1 := minInt(b.Max.X-1, x+r)
			for yy := yy0; yy <= yy1 && v == 0; yy++ {
				off := (yy-b.Min.Y)*src.Stride + (xx0 - b.Min.X)
				for xx := xx0; xx <= xx1; xx++ {
					if src.Pix[off] >= 128 { v = 255; break }
					off++
				}
			}
			dst.SetGray(x, y, color.Gray{Y: v})
		}
	}
	return dst
}

func morphErodeGray(src *image.Gray, r int) *image.Gray {
	if r < 1 {
		return src
	}
	b := src.Bounds()
	dst := image.NewGray(b)
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			v := uint8(255)
			yy0 := maxInt(b.Min.Y, y-r)
			yy1 := minInt(b.Max.Y-1, y+r)
			xx0 := maxInt(b.Min.X, x-r)
			xx1 := minInt(b.Max.X-1, x+r)
			for yy := yy0; yy <= yy1 && v == 255; yy++ {
				off := (yy-b.Min.Y)*src.Stride + (xx0 - b.Min.X)
				for xx := xx0; xx <= xx1; xx++ {
					if src.Pix[off] < 128 { v = 0; break }
					off++
				}
			}
			dst.SetGray(x, y, color.Gray{Y: v})
		}
	}
	return dst
}

// Closing = dilate -> erode. Радиус 3 хорошо «заливает» сетку/цифры.
func morphClosingGray(src *image.Gray, r int) *image.Gray {
	return morphErodeGray(morphDilateGray(src, r), r)
}

func maxInt(a, b int) int { if a>b {return a}; return b }
func minInt(a, b int) int { if a<b {return a}; return b }

// ====== 2) CCL-детектор по маске (основной путь) ======

type candidate struct {
	Rect image.Rectangle
	Area int
	Fill float64 // Area / (w*h)
	Score float64
}

// DetectByCCL ищет большую «фиолетовую» компоненту подходящей формы/размера.
// Предполагаем TargetSize ~ 494±3, но допускаем усадку/просветы на краях.
func DetectByCCL(mask *image.Gray) (image.Rectangle, bool) {
	// легкий closing, чтобы «залить» цифры/швы
	closed := morphClosingGray(mask, 3)
	b := closed.Bounds()

	w, h := b.Dx(), b.Dy()
	visited := make([]bool, w*h)
	idx := func(x, y int) int { return (y-b.Min.Y)*w + (x - b.Min.X) }

	best := candidate{Rect: image.Rect(0,0,0,0), Score: -1}

	stack := make([]image.Point, 0, 4096)
	push := func(p image.Point){ stack = append(stack, p) }
	pop  := func() image.Point {
		n := len(stack)-1; p := stack[n]; stack = stack[:n]; return p
	}

	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			if visited[idx(x,y)] { continue }
			if closed.GrayAt(x,y).Y < 128 {
				visited[idx(x,y)] = true
				continue
			}
			// flood-fill 4-соседством
			minX, maxX, minY, maxY := x, x, y, y
			area := 0
			push(image.Pt(x,y))
			visited[idx(x,y)] = true
			for len(stack) > 0 {
				p := pop()
				area++
				if p.X < minX {minX = p.X}
				if p.X > maxX {maxX = p.X}
				if p.Y < minY {minY = p.Y}
				if p.Y > maxY {maxY = p.Y}
				// соседи
				for _, d := range [...]image.Point{{1,0},{-1,0},{0,1},{0,-1}} {
					nx, ny := p.X+d.X, p.Y+d.Y
					if nx<b.Min.X || nx>=b.Max.X || ny<b.Min.Y || ny>=b.Max.Y { continue }
					id := idx(nx,ny)
					if visited[id] { continue }
					visited[id] = true
					if closed.GrayAt(nx,ny).Y >= 128 {
						push(image.Pt(nx,ny))
					}
				}
			}
			rect := image.Rect(minX, minY, maxX+1, maxY+1)
			bw, bh := rect.Dx(), rect.Dy()
			if bw < 380 || bh < 380 { // отсечь мусор
				continue
			}

			aspect := float64(minInt(bw,bh)) / float64(maxInt(bw,bh))
			fill := float64(area) / float64(bw*bh)

			// допускаем «усадку» и неидеальные края
			sizePenalty := math.Abs(float64(bw-TargetSize)) + math.Abs(float64(bh-TargetSize))
			score := 0.0
			if aspect >= 0.88 && aspect <= 1.12 && fill >= 0.65 && fill <= 0.98 {
				// чем ближе к 494 и к «квадратности», тем лучше
				score = 0.6*fill + 0.3*aspect - 0.001*sizePenalty
			}
			if score > best.Score {
				best = candidate{Rect: rect, Area: area, Fill: fill, Score: score}
			}
		}
	}

	if best.Score < 0 {
		return image.Rect(0,0,0,0), false
	}
	return best.Rect, true
}

// ====== 3) SAT-детектор «кольцом» фиксированного окна 494×494 (фоллбэк) ======

type sat2d struct {
	W, H int
	S []int32 // (H+1)*(W+1), суммирование по Gray>=128
}

// buildSAT строит интегральную сумму по бинарному изображению: белый=1, чёрный=0.
func buildSAT(g *image.Gray) sat2d {
	b := g.Bounds()
	W, H := b.Dx(), b.Dy()
	S := make([]int32, (H+1)*(W+1))
	at := func(x, y int) int32 {
		if g.GrayAt(x+b.Min.X, y+b.Min.Y).Y >= 128 { return 1 }
		return 0
	}
	for y := 1; y <= H; y++ {
		rowSum := int32(0)
		for x := 1; x <= W; x++ {
			rowSum += at(x-1, y-1)
			S[y*(W+1)+x] = S[(y-1)*(W+1)+x] + rowSum
		}
	}
	return sat2d{W: W, H: H, S: S}
}

func (sat sat2d) sumRect(r image.Rectangle) int32 {
	// r в координатах исходного изображения g.Bounds()
	x0 := maxInt(0, r.Min.X)
	y0 := maxInt(0, r.Min.Y)
	x1 := minInt(sat.W, r.Max.X)
	y1 := minInt(sat.H, r.Max.Y)
	if x1 <= x0 || y1 <= y0 { return 0 }
	W := sat.W+1
	A := sat.S[y0*W + x0]
	B := sat.S[y0*W + x1]
	C := sat.S[y1*W + x0]
	D := sat.S[y1*W + x1]
	return D - B - C + A
}

func expandRect(r image.Rectangle, t int, b image.Rectangle) image.Rectangle {
	r = image.Rect(r.Min.X-t, r.Min.Y-t, r.Max.X+t, r.Max.Y+t)
	if r.Min.X < b.Min.X { r.Min.X = b.Min.X }
	if r.Min.Y < b.Min.Y { r.Min.Y = b.Min.Y }
	if r.Max.X > b.Max.X { r.Max.X = b.Max.X }
	if r.Max.Y > b.Max.Y { r.Max.Y = b.Max.Y }
	return r
}
func insetRect(r image.Rectangle, t int) image.Rectangle {
	r = image.Rect(r.Min.X+t, r.Min.Y+t, r.Max.X-t, r.Max.Y-t)
	if r.Min.X > r.Max.X { r.Min.X = r.Max.X }
	if r.Min.Y > r.Max.Y { r.Min.Y = r.Max.Y }
	return r
}
func areaRect(r image.Rectangle) int { if r.Empty() { return 0 }; return r.Dx()*r.Dy() }

// ScanFixedWindowSAT — быстрый перебор окна 494×494 по маске (через SAT).
// Возвращает лучший прямоугольник и оценку score (0..~1).
func ScanFixedWindowSAT(mask *image.Gray, step, t int) (image.Rectangle, float64, bool) {
	const W = TargetSize
	b := mask.Bounds()
	if b.Dx() < W || b.Dy() < W { return image.Rect(0,0,0,0), 0, false }

	sat := buildSAT(mask)

	bestScore := -1.0
	bestRect := image.Rect(0,0,0,0)

	for y := b.Min.Y; y <= b.Max.Y-W; y += step {
		for x := b.Min.X; x <= b.Max.X-W; x += step {
			R := image.Rect(x, y, x+W, y+W)
			inside := float64(sat.sumRect(R))
			rIn := inside / float64(W*W)
			if rIn < 0.55 { continue }

			Rin  := insetRect(R, t)
			Rout := expandRect(R, t, b)

			innerRing := float64(sat.sumRect(R) - sat.sumRect(Rin))
			outerRing := float64(sat.sumRect(Rout) - sat.sumRect(R))

			innerPix := float64(areaRect(R) - areaRect(Rin))
			outerPix := float64(areaRect(Rout) - areaRect(R))

			rhoIn := 0.0
			if innerPix > 0 { rhoIn = innerRing / innerPix }
			rhoOut := 0.0
			if outerPix > 0 { rhoOut = outerRing / outerPix }

			edge := rhoIn - rhoOut
			if edge < 0.10 { continue }

			score := 0.7*rIn + 0.5*edge
			if score > bestScore {
				bestScore = score
				bestRect = R
			}
		}
	}
	return bestRect, bestScore, bestScore >= 0
}

// ====== 4) Склейка: полный детект по маске ======

// DetectSquare494 пытается сначала CCL, если не нашли — SAT.
func DetectSquare494(img image.Image) (image.Rectangle, float64, bool) {
	// 1) маска фиолетового
	mask := PurpleMaskHSVLAB(img)

	// 2) основной путь: CCL
	if rect, ok := DetectByCCL(mask); ok {
		rect = TightenToMaskInner(mask, rect, TightenPct)
		rect = SafeInset(rect, InsetFinal)
		return rect, 0.95, true
	}

	// 3) фоллбэк: SAT «кольцом»
	step := 4
	t := 8
	if rect, score, ok := ScanFixedWindowSAT(mask, step, t); ok {
		rect = TightenToMaskInner(mask, rect, TightenPct)
		rect = SafeInset(rect, InsetFinal)
		return rect, math.Max(0.0, math.Min(1.0, score)), true
	}

	return image.Rect(0,0,0,0), 0, false
}
