# coding: utf-8
import os
import json
import shutil

print('[M1 Build] Initializing generation of Agent system...')

os.makedirs('d:/Japanese PSES/.agents/agents/product_manager_agent', exist_ok=True)
os.makedirs('d:/Japanese PSES/.agents/agents/director_agent', exist_ok=True)
os.makedirs('d:/Japanese PSES/.agents/agents/game_designer_agent', exist_ok=True)
os.makedirs('d:/Japanese PSES/.agents/agents/graph_evolution_agent', exist_ok=True)
os.makedirs('d:/Japanese PSES/.agents/agents/qa_player_agent', exist_ok=True)
os.makedirs('d:/Japanese PSES/.agents/agents/bug_repair_agent', exist_ok=True)
os.makedirs('d:/Japanese PSES/js', exist_ok=True)
os.makedirs('d:/Japanese PSES/tests', exist_ok=True)
