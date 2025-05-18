from flask import Blueprint, render_template, send_file, make_response
from flask_login import login_required, current_user
import os
import tempfile
from datetime import datetime

from ..models import DiaryEntry, Cycle

# Create Blueprint
export_bp = Blueprint('export', __name__)

@export_bp.route('/txt')
@login_required
def export_txt():
    """Export diary entries as text file."""
    entries = DiaryEntry.query.filter_by(user_id=current_user.id).order_by(DiaryEntry.created_at.desc()).all()
    
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.txt', mode='w', encoding='utf-8')
    
    # Write header
    temp_file.write(f"CÁRIS - Jornada de {current_user.username}\n")
    temp_file.write(f"Exportado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}\n")
    temp_file.write("=" * 50 + "\n\n")
    
    # Group entries by cycle
    entries_by_cycle = {}
    for entry in entries:
        cycle_name = entry.cycle.name
        if cycle_name not in entries_by_cycle:
            entries_by_cycle[cycle_name] = []
        entries_by_cycle[cycle_name].append(entry)
    
    # Write entries by cycle
    for cycle_name, cycle_entries in entries_by_cycle.items():
        temp_file.write(f"== {cycle_name} ==\n\n")
        
        for entry in cycle_entries:
            temp_file.write(f"Data: {entry.created_at.strftime('%d/%m/%Y %H:%M')}\n")
            temp_file.write(f"Emoção: {entry.emotion}\n")
            temp_file.write(f"Reflexão:\n{entry.content}\n")
            temp_file.write("-" * 40 + "\n\n")
    
    temp_file.close()
    
    # Send file to user
    return send_file(
        temp_file.name,
        as_attachment=True,
        download_name=f"caris_jornada_{current_user.username}_{datetime.now().strftime('%Y%m%d')}.txt",
        mimetype='text/plain'
    )

@export_bp.route('/pdf')
@login_required
def export_pdf():
    """Export diary entries as PDF."""
    entries = DiaryEntry.query.filter_by(user_id=current_user.id).order_by(DiaryEntry.created_at.desc()).all()
    cycles = Cycle.query.all()
    
    # Render template to HTML
    html = render_template(
        'export/pdf_template.html',
        user=current_user,
        entries=entries,
        cycles=cycles,
        export_date=datetime.now().strftime('%d/%m/%Y %H:%M')
    )
    
    # Use pdfkit to convert HTML to PDF
    try:
        import pdfkit
        
        # Create temporary file for PDF
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        temp_file.close()
        
        # Convert HTML to PDF
        options = {
            'page-size': 'A4',
            'margin-top': '1cm',
            'margin-right': '1cm',
            'margin-bottom': '1cm',
            'margin-left': '1cm',
            'encoding': 'UTF-8',
            'title': f'CÁRIS - Jornada de {current_user.username}'
        }
        
        pdfkit.from_string(html, temp_file.name, options=options)
        
        # Send PDF to user
        return send_file(
            temp_file.name,
            as_attachment=True,
            download_name=f"caris_jornada_{current_user.username}_{datetime.now().strftime('%Y%m%d')}.pdf",
            mimetype='application/pdf'
        )
    
    except ImportError:
        # If pdfkit is not available, return HTML
        response = make_response(html)
        response.headers['Content-Type'] = 'text/html'
        response.headers['Content-Disposition'] = f'attachment; filename=caris_jornada_{current_user.username}_{datetime.now().strftime("%Y%m%d")}.html'
        return response
