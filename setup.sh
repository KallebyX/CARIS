#!/bin/bash
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python create_demo_db.py