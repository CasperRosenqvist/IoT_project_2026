import network
import time
import urequests
from machine import Pin
import dht
import config

THINGSPEAK_URL = "http://api.thingspeak.com/update"

# Initialize sensor (GPIO 16), warning LED (GPIO 15), and error LED (GPIO 13)
sensor = dht.DHT11(Pin(16))
red_led = Pin(15, Pin.OUT)
error_led = Pin(13, Pin.OUT)

# Define threshold limits (adjust these as needed)
TEMP_MIN = 20.0  # °C (too cold limit)
TEMP_MAX = 25.0  # °C (too hot limit)
HUM_MIN = 30.0   # % (too dry limit)
HUM_MAX = 70.0   # % (too humid limit)

led = machine.Pin("LED", machine.Pin.OUT)

# Blink onboard LED 3 times on startup
for _ in range(3):
    led.value(1)
    time.sleep(0.4)
    led.value(0)
    time.sleep(0.4)

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("Connecting to Wi-Fi...")
        wlan.connect(config.WIFI_SSID, config.WIFI_PASS)
        while not wlan.isconnected():
            time.sleep(1)
    print("Wi-Fi connected! IP:", wlan.ifconfig()[0])

def send_data(temp, hum):
    url = f"http://184.106.153.149/update?api_key={config.WRITE_API_KEY}&field1={temp}&field2={hum}"
    try:
        print("Sending data to ThingSpeak...")
        headers = {"Host": "api.thingspeak.com"}
        response = urequests.get(url, headers=headers)
        
        resp_text = response.text
        print("ThingSpeak response:", resp_text)
        response.close()
        
        # Check if ThingSpeak returned '0' (rate limit exceeded or too frequent updates)
        if resp_text.strip() == "0":
            print("Notice: ThingSpeak returned '0' (rate limit or similar).")
            # Flash error LED once for 1 second
            error_led.value(1)
            time.sleep(1)
            error_led.value(0)
        else:
            # Successful send -> flash onboard LED briefly
            led.value(1)
            time.sleep(0.5)
            led.value(0)
            error_led.value(0)  # Ensure error LED is turned off
            
    except Exception as e:
        print("Send error:", e)
        # Critical error -> flash error LED 5 times as a warning
        for _ in range(5):
            error_led.value(1)
            time.sleep(0.2)
            error_led.value(0)
            time.sleep(0.2)

connect_wifi()

try:
    while True:
        sensor.measure()
        temp = sensor.temperature()
        hum = sensor.humidity()
        print(f"Temperature: {temp} °C, Humidity: {hum} %")
        
        if temp < TEMP_MIN or temp > TEMP_MAX or hum < HUM_MIN or hum > HUM_MAX:
            red_led.value(1)
            print("Warning: Value out of range! Red LED ON.")
        else:
            red_led.value(0)
            print("Status normal. Red LED OFF.")
            
        send_data(temp, hum)
        time.sleep(300)  # Wait for 5 minutes before next reading

except KeyboardInterrupt:
    # Executed when stopping the script (e.g. Ctrl+C)
    print("Program stopped. Turning off LEDs...")
    red_led.value(0)
    error_led.value(0)
    led.value(0)