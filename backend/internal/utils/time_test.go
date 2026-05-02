package utils

import "testing"

func TestIsValidFiveMinuteTime(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		value string
		want  bool
	}{
		{name: "midnight", value: "00:00", want: true},
		{name: "five minute mark", value: "09:05", want: true},
		{name: "last valid slot", value: "23:55", want: true},
		{name: "single digit hour", value: "9:05", want: false},
		{name: "one minute", value: "09:01", want: false},
		{name: "seven minutes", value: "09:07", want: false},
		{name: "invalid hour", value: "24:00", want: false},
		{name: "invalid minute", value: "09:60", want: false},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			if got := IsValidFiveMinuteTime(tt.value); got != tt.want {
				t.Fatalf("IsValidFiveMinuteTime(%q) = %v, want %v", tt.value, got, tt.want)
			}
		})
	}
}
