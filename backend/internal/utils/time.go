package utils

import "strconv"

func IsValidFiveMinuteTime(value string) bool {
	if len(value) != 5 || value[2] != ':' {
		return false
	}

	hour, err := strconv.Atoi(value[:2])
	if err != nil || hour < 0 || hour > 23 {
		return false
	}

	minute, err := strconv.Atoi(value[3:])
	if err != nil || minute < 0 || minute > 59 {
		return false
	}

	return minute%5 == 0
}
