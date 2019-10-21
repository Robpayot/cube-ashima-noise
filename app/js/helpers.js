// Math

export function clamp(value, min, max) {

	return Math.min(Math.max(value, min), max)
}

export function round(value, dec) {

	return Math.round(value * dec) / dec
}

export function getRandom(min, max) {
	return Math.random() * (max - min) + min
}

export function browser() {
	let ua = navigator.userAgent,
		tem,
		M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || []
	if (/trident/i.test(M[1])) {
		tem = /\brv[ :]+(\d+)/g.exec(ua) || []
		return `IE ${(tem[1] || '')}`
	}
	if (M[1] === 'Chrome') {
		tem = ua.match(/\b(OPR|Edge)\/(\d+)/)
		if (tem !== null) return tem.slice(1).join(' ').replace('OPR', 'Opera')
	}
	M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?']
	if (tem = ua.match(/version\/(\d+)/i) !== null) M.splice(1, 1, tem[1])
	return M.join(' ')
}

export 	function isPowerOf2(value) {
	return value & value - 1 === 0
}
