from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password


class CoordinadorForm(forms.Form):
    username = forms.CharField(label="Usuario", max_length=150)
    password1 = forms.CharField(label="Contraseña", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Repite la contraseña", widget=forms.PasswordInput)

    def clean_username(self):
        u = self.cleaned_data["username"].strip()
        if get_user_model().objects.filter(username__iexact=u).exists():
            raise forms.ValidationError("Ese usuario ya existe.")
        return u

    def clean(self):
        datos = super().clean()
        p1, p2 = datos.get("password1"), datos.get("password2")
        if p1 and p2 and p1 != p2:
            self.add_error("password2", "Las contraseñas no coinciden.")
        elif p1:
            try:
                validate_password(p1)
            except forms.ValidationError as e:
                self.add_error("password1", e)
        return datos
