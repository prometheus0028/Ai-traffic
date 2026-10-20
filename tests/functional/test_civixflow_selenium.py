"""Selenium smoke and interaction tests for the current CivixFlow dashboard."""

from __future__ import annotations
import os
from pathlib import Path
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait, Select

BASE_URL = os.environ.get("TRAFFICMIND_URL", "http://127.0.0.1:8000").rstrip("/")
TIMEOUT_S = int(os.environ.get("SELENIUM_TIMEOUT_S", "25"))
REPORTS = Path(os.environ.get("TEST_REPORTS_DIR", "reports"))


@pytest.fixture
def driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1600,1100")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    browser = webdriver.Chrome(options=options)
    browser.set_page_load_timeout(TIMEOUT_S)
    yield browser
    browser.quit()


def _save_screenshot(browser: webdriver.Chrome, name: str) -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)
    browser.save_screenshot(str(REPORTS / name))


@pytest.mark.functional
def test_primary_dashboard_renders_and_local_simulation_controls_work(
    driver: webdriver.Chrome,
) -> None:
    """Verify primary dashboard modules and safe local simulation controls."""
    driver.get(f"{BASE_URL}/")
    wait = WebDriverWait(driver, TIMEOUT_S)
    wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
    wait.until(lambda d: d.find_element(By.ID, "trafficCanvas").is_displayed())
    assert "CivixFlow" in driver.title
    body = driver.find_element(By.TAG_NAME, "body").text
    expected_phrases = (
        "CivixFlow",
        "Zone: Downtown Central Core",
        "Intersection Safety Score",
        "Predictive Congestion Horizon",
        "Emergency Priority Dispatch",
        "Explainable AI (XAI) Feed",
        "Downtown Congestion Trend",
    )

    body_lower = body.casefold()

    for phrase in expected_phrases:
        assert (
            phrase.casefold() in body_lower
        ), f"Expected dashboard content was missing: {phrase!r}"
    canvas_size = driver.find_element(By.ID, "trafficCanvas").size
    assert canvas_size["width"] > 100 and canvas_size["height"] > 100
    for element_id in (
        "scenarioPresetSelect",
        "playPauseBtn",
        "dispatchAmbulanceBtn",
    ):
        ai_toggle = driver.find_element(By.ID, "aiModeToggle")
        assert ai_toggle.is_enabled(), "AI mode checkbox should be enabled"
        assert driver.find_element(
            By.ID, element_id
        ).is_displayed(), f"Missing visible element: {element_id}"
    # Scenario and pause controls affect only browser simulation; hardware buttons are never clicked.
    scenario = Select(driver.find_element(By.ID, "scenarioPresetSelect"))
    scenario.select_by_value("RUSH_HOUR")
    assert scenario.first_selected_option.get_attribute("value") == "RUSH_HOUR"
    button = driver.find_element(By.ID, "playPauseBtn")
    first_label = button.text.strip().lower()
    button.click()
    wait.until(
        lambda d: d.find_element(By.ID, "playPauseBtn").text.strip().lower()
        != first_label
    )
    button = driver.find_element(By.ID, "playPauseBtn")
    assert button.text.strip()
    button.click()  # restore animation
    wait.until(
        lambda d: d.find_element(By.ID, "renderStats").text.strip()
        != "Starting renderer"
    )
    _save_screenshot(driver, "selenium-dashboard.png")
    logs = driver.get_log("browser")
    severe = [
        e.get("message", "")
        for e in logs
        if e.get("level") == "SEVERE" and "favicon" not in e.get("message", "").lower()
    ]
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "selenium-browser-console.txt").write_text(
        "\n".join(severe) if severe else "No SEVERE browser-console entries captured.",
        encoding="utf-8",
    )
    assert not severe, "Browser console reported severe errors:\n" + "\n".join(severe)


@pytest.mark.functional
def test_dashboard_identity_endpoint_matches_current_ui(
    driver: webdriver.Chrome,
) -> None:
    """Verify the current dashboard identifier endpoint in the browser."""
    driver.get(f"{BASE_URL}/api/app")
    WebDriverWait(driver, TIMEOUT_S).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )
    payload = driver.find_element(By.TAG_NAME, "body").text.replace(" ", "")
    assert '"dashboard":"civixflow"' in payload
