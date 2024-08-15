import concurrent.futures
import requests
import time
import os
import itertools

CHART_URL = "https://dev.timescalecreator.org/chart"
SVG_STATUS_URL = "https://dev.timescalecreator.org/svgstatus/"
GET_CHART_URL = "https://dev.timescalecreator.org"
DATA_DIR = "./ping_files/data"
SVG_DIR = "./ping_files/charts"
data_files = {os.path.splitext(file)[0]: os.path.join(DATA_DIR, file) for file in os.listdir(DATA_DIR)}
svg_files = {os.path.splitext(file)[0]: os.path.join(SVG_DIR, file) for file in os.listdir(SVG_DIR)}

HEADERS = {"Content-Type": "text/plain"}

common_files = list(set(data_files.keys()).intersection(svg_files.keys()))

def read_file(file_path):
    with open(file_path, "r") as file:
        return file.read()

def ping_endpoint(file_key, thread_id, silent=False):
    def log(message):
        if not silent:
            print(message)

    try:
        data_file = data_files[file_key]
        svg_file = svg_files[file_key]
        DATA = read_file(data_file)
        expected_svg = read_file(svg_file)

        start_time = time.time()
        response = requests.post(CHART_URL, data=DATA, headers=HEADERS)
        initial_response_time = time.time() - start_time
        if response.status_code == 200:
            log(f"[Thread-{thread_id}] [{file_key}] Initial request successful, status code 200")
            json_response = response.json()
            chart_hash_url = json_response.get("hash")
            if chart_hash_url:
                log(f"[Thread-{thread_id}] [{file_key}] chart_hash_url obtained: {chart_hash_url}")
                # Ping /svgstatus/hash
                while time.time() - start_time < 500:
                    status_response = requests.get(SVG_STATUS_URL + chart_hash_url, headers=HEADERS)
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        log(f"[Thread-{thread_id}] [{file_key}] Status response received, status code 200, status data: {status_data}")
                        log(f"[Thread-{thread_id}] [{file_key}] Full SVG Status Response: {status_response.text}")
                        if status_data.get("ready") == True:
                            log(f"[Thread-{thread_id}] [{file_key}] Status is ready")
                            chart_path = json_response.get("chartpath")
                            if chart_path:
                                log(f"[Thread-{thread_id}] [{file_key}] chart_path obtained: {chart_path}")
                                # Get the actual chart
                                chart_response = requests.get(GET_CHART_URL + chart_path, headers=HEADERS)
                                response_time = time.time() - start_time
                                log(f"[Thread-{thread_id}] [{file_key}] Final chart received, status code {chart_response.status_code}")
                                #log(f"[Thread-{thread_id}] [{file_key}] Full Chart Response: {chart_response.text}")
                                return file_key, initial_response_time, response_time, chart_response.status_code, chart_response.text, expected_svg
                            else:
                                log(f"[Thread-{thread_id}] [{file_key}] chart_path not found in json_response")
                        else:
                            log(f"[Thread-{thread_id}] [{file_key}] Status not ready yet")
                    else:
                        log(f"[Thread-{thread_id}] [{file_key}] Status response error, status code: {status_response.status_code}")
                        log(f"[Thread-{thread_id}] [{file_key}] Full Status Response Error: {status_response.text}")
                    time.sleep(5)
            else:
                log(f"[Thread-{thread_id}] [{file_key}] chart_hash_url not found in json_response")
        else:
            log(f"[Thread-{thread_id}] [{file_key}] Initial request failed, status code: {response.status_code}, response text: {response.text}")
        log(f"[Thread-{thread_id}] [{file_key}] Request failed, status code: {response.status_code}, response text: {response.text}")
        return file_key, None, None, response.status_code, response.text, None
    except requests.exceptions.Timeout:
        log(f"[Thread-{thread_id}] [{file_key}] Request timeout occurred")
        return file_key, None, None, 408, None, None
    except requests.exceptions.RequestException as e:
        log(f"[Thread-{thread_id}] [{file_key}] Request exception: {e}")
        if hasattr(e, 'response') and e.response is not None:
            return file_key, None, None, e.response.status_code, None, None
        else:
            return file_key, None, None, None, None, None

def do_ping(num_users, silent=False):
    timeouts = []
    server_busy = []
    gateway_timeout = []
    other_errors = []
    initial_response_times = []
    response_times = []
    match_count = 0
    mismatch_count = 0
    results = []

    print("*" * 50)
    print(f"Simulating {num_users} users pinging the endpoint")
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_users) as executor:
        selected_files = list(itertools.islice(itertools.cycle(common_files), num_users))
        futures = [executor.submit(ping_endpoint, file_key, i, silent) for i, file_key in enumerate(selected_files)]
        for future in concurrent.futures.as_completed(futures):
            file_key, initial_response_time, response_time, status_code, response_body, expected_svg = future.result()
            if initial_response_time is not None and response_time is not None and status_code == 200:
                initial_response_times.append(initial_response_time)
                response_times.append(response_time)
                results.append((file_key, initial_response_time, response_time))
                if response_body == expected_svg:
                    match_count += 1
                else:
                    mismatch_count += 1
            elif status_code == 408:
                timeouts.append(file_key)
            elif status_code == 503:
                server_busy.append(file_key)
            elif status_code == 504:
                gateway_timeout.append(file_key)
            else:
                other_errors.append((file_key, status_code, response_body))

    if initial_response_times:
        average_initial_response_time = sum(initial_response_times) / len(initial_response_times)
    else:
        average_initial_response_time = float("inf")
    if response_times:
        average_response_time = sum(response_times) / len(response_times)
    else:
        average_response_time = float("inf")

    print(f"Number of successful responses (200): {len(response_times)}")
    print(f"Number of timeouts (408): {len(timeouts)} - {timeouts}")
    print(f"Number of server busy (503): {len(server_busy)} - {server_busy}")
    print(f"Number of gateway timeouts (504): {len(gateway_timeout)} - {gateway_timeout}")
    print(f"Other errors: {other_errors}")
    print(f"Number of matching responses: {match_count}")
    print(f"Number of mismatching responses: {mismatch_count}")
    print(f"Average response time of chart request: {average_initial_response_time:.2f} seconds")
    print(f"All chart request times: {initial_response_times}")
    print(f"Average total response time: {average_response_time:.2f} seconds")
    print(f"All total response times: {response_times}")
    print("\nDetails for each request:")
    for file_key, initial_resp_time, total_resp_time in results:
        print(f"File: {file_key}, Initial Response Time: {initial_resp_time:.2f} seconds, Total Response Time: {total_resp_time:.2f} seconds")
    print("*" * 50)
    print("\n")

def main():
    num_of_users = [5, 10, 20]
    for num_users in num_of_users:
        do_ping(num_users, silent=True)

if __name__ == "__main__":
    main()
