package config

type Config struct {
	Port      string
	JWTSecret string
}

func LoadConfig() *Config {
	return &Config{
		Port:      ":8080",
		JWTSecret: "itstep_super_secret_key_2026",
	}
}