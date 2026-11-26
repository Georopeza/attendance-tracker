from django import forms

from .models import DIAS, Disponibilidad


class FranjaForm(forms.ModelForm):
    desde = forms.TimeField(widget=forms.TimeInput(attrs={"type": "time"}), initial="09:00")
    hasta = forms.TimeField(widget=forms.TimeInput(attrs={"type": "time"}), initial="16:00")

    class Meta:
        model = Disponibilidad
        fields = ["dia", "desde", "hasta"]
